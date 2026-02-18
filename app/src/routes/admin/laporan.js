// routes/admin/laporan.js
// GET /api/admin/laporan — Laporan Penjualan

import express from "express";
import prisma from "../../prisma.js";
import auth from "../../middleware/auth.js";

const router = express.Router();

function onlyAdmin(req, res, next) {
  if (!req.user || String(req.user.peran) !== "ADMIN") {
    return res.status(403).json({ message: "Akses admin ditolak" });
  }
  next();
}

/**
 * GET /api/admin/laporan
 *
 * Query params:
 *   from   — ISO date string, e.g. "2024-01-01"  (opsional)
 *   to     — ISO date string, e.g. "2024-01-31"  (opsional)
 *   status — StatusPesanan enum                   (opsional)
 *
 * Response:
 * {
 *   summary: { totalPendapatan, totalPesanan, pesananSelesai, pesananBatal, totalItem, rataRata },
 *   harian:  [{ tanggal, pendapatan, jumlahPesanan }],
 *   topProduk: [{ nama, qty, pendapatan }],
 *   statusBreakdown: [{ status, jumlah }],
 *   pesanan: [...] // detail ringkas, sama seperti /api/admin/pesanan
 * }
 */
router.get("/", auth, onlyAdmin, async (req, res) => {
  try {
    const from   = req.query.from ? new Date(req.query.from) : null;
    const to     = req.query.to   ? new Date(req.query.to)   : null;
    const status = req.query.status ? String(req.query.status).trim() : null;

    if (from) from.setHours(0, 0, 0, 0);
    if (to)   to.setHours(23, 59, 59, 999);

    // ── Build WHERE ───────────────────────────────────────
    const where = {};
    if (status) where.status = status;
    if (from || to) {
      where.dibuatPada = {};
      if (from) where.dibuatPada.gte = from;
      if (to)   where.dibuatPada.lte = to;
    }

    // ── Fetch pesanan ─────────────────────────────────────
    const pesanan = await prisma.pesanan.findMany({
      where,
      orderBy: { dibuatPada: "desc" },
      select: {
        id:         true,
        dibuatPada: true,
        status:     true,
        subtotal:   true,
        ongkir:     true,
        diskon:     true,
        totalAkhir: true,

        pengguna: {
          select: {
            id:    true,
            email: true,
            profil: { select: { namaDepan: true, namaBelakang: true } },
          },
        },

        pembayaran: {
          select: { status: true, metode: true, provider: true, paidAt: true },
        },

        item: {
          select: {
            jumlah:  true,
            harga:   true,
            produkId: true,
            produk:  { select: { nama: true, gambarUtama: true } },
          },
        },

        _count: { select: { item: true } },
      },
    });

    // ── Normalise pengguna.nama ───────────────────────────
    const mapped = pesanan.map((o) => {
      const p    = o.pengguna?.profil;
      const nama = p ? `${p.namaDepan || ""} ${p.namaBelakang || ""}`.trim() : "";
      return {
        ...o,
        pengguna: {
          id:    o.pengguna?.id,
          email: o.pengguna?.email,
          nama:  nama || o.pengguna?.email || "User",
        },
      };
    });

    // ── Summary ───────────────────────────────────────────
    const selesai  = mapped.filter((o) => o.status === "SELESAI");
    const batal    = mapped.filter((o) => o.status === "DIBATALKAN");

    const totalPendapatan = selesai.reduce((s, o) => s + Number(o.totalAkhir || 0), 0);
    const totalItem       = selesai.reduce((s, o) => {
      return s + o.item.reduce((a, i) => a + Number(i.jumlah || 0), 0);
    }, 0);
    const rataRata        = selesai.length ? Math.round(totalPendapatan / selesai.length) : 0;

    const summary = {
      totalPendapatan,
      totalPesanan:   mapped.length,
      pesananSelesai: selesai.length,
      pesananBatal:   batal.length,
      totalItem,
      rataRata,
    };

    // ── Harian (hanya SELESAI) ────────────────────────────
    const harianMap = {};
    selesai.forEach((o) => {
      const day = new Date(o.dibuatPada).toISOString().slice(0, 10);
      if (!harianMap[day]) harianMap[day] = { pendapatan: 0, jumlahPesanan: 0 };
      harianMap[day].pendapatan    += Number(o.totalAkhir || 0);
      harianMap[day].jumlahPesanan += 1;
    });
    const harian = Object.entries(harianMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tanggal, d]) => ({ tanggal, ...d }));

    // ── Top Produk ────────────────────────────────────────
    const produkMap = {};
    selesai.forEach((o) => {
      o.item.forEach((it) => {
        const nama = it.produk?.nama || `Produk #${it.produkId}`;
        if (!produkMap[nama]) produkMap[nama] = { qty: 0, pendapatan: 0 };
        produkMap[nama].qty        += Number(it.jumlah || 0);
        produkMap[nama].pendapatan += Number(it.harga || 0) * Number(it.jumlah || 0);
      });
    });
    const topProduk = Object.entries(produkMap)
      .map(([nama, d]) => ({ nama, ...d }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // ── Status Breakdown ──────────────────────────────────
    const statusMap = {};
    mapped.forEach((o) => {
      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    });
    const statusBreakdown = Object.entries(statusMap)
      .map(([status, jumlah]) => ({ status, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    res.json({ summary, harian, topProduk, statusBreakdown, pesanan: mapped });
  } catch (e) {
    console.error("GET /api/admin/laporan error:", e);
    res.status(500).json({ message: "Gagal memuat laporan" });
  }
});

export default router;