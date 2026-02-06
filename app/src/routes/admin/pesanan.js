import express from "express";
import prisma from "../../prisma.js";
import auth from "../../middleware/auth.js";

const router = express.Router();

// middleware admin sederhana (sesuaikan field peran kamu)
function onlyAdmin(req, res, next) {
  if (!req.user || String(req.user.peran) !== "ADMIN") {
    return res.status(403).json({ message: "Akses admin ditolak" });
  }
  next();
}

// GET /api/admin/pesanan  -> list semua pesanan (ringkas)
router.get("/", auth, onlyAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();              // cari id
    const status = String(req.query.status || "").trim();    // status enum
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);

    const where = {};

    if (q) {
      const idNum = Number(q);
      if (!Number.isNaN(idNum)) where.id = idNum;
    }

    if (status) where.status = status;

    if (from || to) {
      where.dibuatPada = {};
      if (from) where.dibuatPada.gte = from;
      if (to) where.dibuatPada.lte = to;
    }

    const data = await prisma.pesanan.findMany({
      where,
      orderBy: { dibuatPada: "desc" },
      select: {
        id: true,
        dibuatPada: true,
        status: true,
        subtotal: true,
        ongkir: true,
        diskon: true,
        totalAkhir: true,

        pengguna: {
          select: {
            id: true,
            email: true,
            profil: { select: { namaDepan: true, namaBelakang: true, nomorTelepon: true } },
          },
        },

        pembayaran: { select: { status: true, metode: true, provider: true, expiredAt: true, paidAt: true, amount: true } },
        pengiriman: { select: { id: true, layananId: true, dibuatPada: true, layanan: { select: { nama: true, estimasiHari: true, kurir: { select: { nama: true, kode: true } } } } } },

        item: {
          take: 3,
          select: {
            id: true,
            jumlah: true,
            harga: true,
            produk: { select: { nama: true, gambarUtama: true } },
          },
        },

        _count: { select: { item: true } },
      },
    });

    // rapikan nama user biar frontend gampang
    const mapped = data.map((o) => {
      const p = o.pengguna?.profil;
      const nama = p ? `${p.namaDepan || ""} ${p.namaBelakang || ""}`.trim() : "";
      return {
        ...o,
        pengguna: {
          id: o.pengguna?.id,
          email: o.pengguna?.email,
          nama: nama || o.pengguna?.email || "User",
          nomorTelepon: p?.nomorTelepon || null,
        },
      };
    });

    res.json(mapped);
  } catch (e) {
    console.error("GET /api/admin/pesanan error:", e);
    res.status(500).json({ message: "Gagal memuat pesanan admin" });
  }
});

// GET /api/admin/pesanan/:id -> detail lengkap
router.get("/:id", auth, onlyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID tidak valid" });

    const data = await prisma.pesanan.findUnique({
      where: { id },
      include: {
        pengguna: { include: { profil: true } },
        item: { include: { produk: true, varian: { include: { atribut: { include: { nilai: { include: { atribut: true } } } } } } } },
        pembayaran: true,
        pengiriman: { include: { layanan: { include: { kurir: true } } } },
      },
    });

    if (!data) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    res.json(data);
  } catch (e) {
    console.error("GET /api/admin/pesanan/:id error:", e);
    res.status(500).json({ message: "Gagal memuat detail pesanan" });
  }
});

// PATCH /api/admin/pesanan/:id/status  body: { status, resi? }
router.patch("/:id/status", auth, onlyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, resi } = req.body || {};
    if (!id) return res.status(400).json({ message: "ID tidak valid" });
    if (!status) return res.status(400).json({ message: "status wajib" });

    // update status pesanan
    const updated = await prisma.pesanan.update({
      where: { id },
      data: { status },
    });

    // kalau kamu punya field resi di model Pengiriman, boleh update di sini.
    // Kalau tidak punya, hapus blok ini.
    if (resi) {
      await prisma.pengiriman.updateMany({
        where: { pesananId: id },
        data: { resi: String(resi) },
      }).catch(() => {});
    }

    res.json({ message: "Status diperbarui", pesanan: updated });
  } catch (e) {
    console.error("PATCH /api/admin/pesanan/:id/status error:", e);
    res.status(500).json({ message: "Gagal update status" });
  }
});

export default router;
