import express from "express";
import prisma from "../prisma.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/**
 * Auto-expire pembayaran milik user yang sudah lewat expiredAt
 * - pembayaran.status MENUNGGU + expiredAt <= now => KADALUARSA
 * - pesanan.status MENUNGGU_PEMBAYARAN => DIBATALKAN
 */
async function autoExpirePayments(tx, penggunaId) {
  const now = new Date();

  const expired = await tx.pembayaran.findMany({
    where: {
      status: "MENUNGGU",
      expiredAt: { not: null, lte: now },
      pesanan: { penggunaId },
    },
    select: { id: true, pesananId: true },
  });

  if (!expired.length) return { expiredCount: 0 };

  const paymentIds = expired.map((x) => x.id);
  const orderIds = expired.map((x) => x.pesananId);

  await tx.pembayaran.updateMany({
    where: { id: { in: paymentIds } },
    data: { status: "KADALUARSA" },
  });

  await tx.pesanan.updateMany({
    where: {
      id: { in: orderIds },
      status: "MENUNGGU_PEMBAYARAN",
    },
    data: { status: "DIBATALKAN" },
  });

  return { expiredCount: expired.length };
}

// include lengkap untuk detail pesanan
const pesananInclude = {
  item: {
    include: {
      produk: true,
      varian: {
        include: {
          atribut: {
            include: {
              nilai: { include: { atribut: true } },
            },
          },
        },
      },
    },
  },
  pembayaran: true,
  pengiriman: {
    include: {
      layanan: { include: { kurir: true } },
    },
  },
};

/**
 * GET /api/pesanan
 * List pesanan milik user login
 */
router.get("/", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;

    await prisma.$transaction(async (tx) => {
      await autoExpirePayments(tx, penggunaId);
    });

    const data = await prisma.pesanan.findMany({
      where: { penggunaId },
      orderBy: { dibuatPada: "desc" },
      select: {
        id: true,
        dibuatPada: true,
        status: true,
        subtotal: true,
        ongkir: true,
        diskon: true,
        totalAkhir: true,
        pembayaran: {
          select: {
            status: true,
            metode: true,
            provider: true,
            expiredAt: true,
            paidAt: true,
            amount: true,
          },
        },
        // ⚠️ jangan select field yang belum tentu ada di schema Pengiriman
        pengiriman: {
          select: {
            id: true,
            layananId: true,
            dibuatPada: true,
            diubahPada: true,
            layanan: {
              select: {
                nama: true,
                estimasiHari: true,
                kurir: { select: { nama: true, kode: true } },
              },
            },
          },
        },
      },
    });

    res.json(data);
  } catch (e) {
    console.error("GET /api/pesanan error:", e);
    res.status(500).json({ message: "Gagal mengambil pesanan" });
  }
});

/**
 * GET /api/pesanan/:id
 * Detail pesanan (milik user login)
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID pesanan tidak valid" });

    await prisma.$transaction(async (tx) => {
      await autoExpirePayments(tx, penggunaId);
    });

    const pesanan = await prisma.pesanan.findFirst({
      where: { id, penggunaId },
      include: pesananInclude,
    });

    if (!pesanan) return res.status(404).json({ message: "Pesanan tidak ditemukan" });

    res.json(pesanan);
  } catch (e) {
    console.error("GET /api/pesanan/:id error:", e);
    res.status(500).json({ message: "Gagal mengambil detail pesanan" });
  }
});

/**
 * PATCH /api/pesanan/:id/batalkan
 * Hanya bisa jika MENUNGGU_PEMBAYARAN
 */
router.patch("/:id/batalkan", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID pesanan tidak valid" });

    await prisma.$transaction(async (tx) => {
      await autoExpirePayments(tx, penggunaId);
    });

    const latest = await prisma.pesanan.findFirst({
      where: { id, penggunaId },
      select: { status: true },
    });

    if (!latest) return res.status(404).json({ message: "Pesanan tidak ditemukan" });

    if (latest.status !== "MENUNGGU_PEMBAYARAN") {
      return res.status(400).json({ message: "Pesanan tidak bisa dibatalkan pada status ini" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.pesanan.update({
        where: { id },
        data: { status: "DIBATALKAN" },
      });

      const pay = await tx.pembayaran.findUnique({ where: { pesananId: id } });
      if (pay && pay.status === "MENUNGGU") {
        await tx.pembayaran.update({
          where: { id: pay.id },
          data: { status: "DIBATALKAN" },
        });
      }

      return up;
    });

    res.json({ message: "Pesanan berhasil dibatalkan", pesanan: updated });
  } catch (e) {
    console.error("PATCH /api/pesanan/:id/batalkan error:", e);
    res.status(500).json({ message: "Gagal membatalkan pesanan" });
  }
});

/**
 * PATCH /api/pesanan/:id/terima
 * Hanya bisa jika DIKIRIM
 */
router.patch("/:id/terima", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID pesanan tidak valid" });

    const pesanan = await prisma.pesanan.findFirst({
      where: { id, penggunaId },
      select: { id: true, status: true },
    });

    if (!pesanan) return res.status(404).json({ message: "Pesanan tidak ditemukan" });

    if (pesanan.status !== "DIKIRIM") {
      return res.status(400).json({ message: "Pesanan hanya bisa dikonfirmasi saat status DIKIRIM" });
    }

    const updated = await prisma.pesanan.update({
      where: { id },
      data: { status: "SELESAI" },
    });

    res.json({ message: "Pesanan dikonfirmasi diterima", pesanan: updated });
  } catch (e) {
    console.error("PATCH /api/pesanan/:id/terima error:", e);
    res.status(500).json({ message: "Gagal konfirmasi pesanan diterima" });
  }
});

export default router;
