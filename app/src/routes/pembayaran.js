import express from "express";
import prisma from "../prisma.js";
import auth from "../middleware/auth.js";
import midtransClient from "midtrans-client";

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});
const router = express.Router();

router.get("/", auth, async (req, res) => {
  const data = await prisma.pembayaran.findMany();
  res.json(data);
});

router.get("/pesanan/:id", auth, async (req, res) => {
  const penggunaId = req.user.id;
  const id = Number(req.params.id);

  const pesanan = await prisma.pesanan.findFirst({
    where: { id, penggunaId },
    include: {
      item: { include: { produk: true, varian: { include: { atribut: { include: { nilai: { include: { atribut: true } } } } } } } },
      pengiriman: { include: { layanan: { include: { kurir: true } } } },
      pembayaran: true,
    },
  });

  if (!pesanan) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
  res.json(pesanan);
});
router.patch("/:id/batalkan", auth, async (req, res) => {
  const penggunaId = req.user.id;
  const id = Number(req.params.id);

  const pesanan = await prisma.pesanan.findFirst({
    where: { id, penggunaId },
    include: { pembayaran: true },
  });

  if (!pesanan) {
    return res.status(404).json({ message: "Pesanan tidak ditemukan" });
  }

  if (pesanan.status !== "MENUNGGU_PEMBAYARAN") {
    return res.status(400).json({
      message: "Pesanan tidak bisa dibatalkan pada status ini",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.pesanan.update({
      where: { id },
      data: { status: "DIBATALKAN" },
    });

    if (pesanan.pembayaran) {
      await tx.pembayaran.update({
        where: { id: pesanan.pembayaran.id },
        data: { status: "DIBATALKAN" },
      });
    }
  });

  res.json({ message: "Pesanan berhasil dibatalkan" });
});

router.post("/:id/bayar", auth, async (req, res) => {
  const penggunaId = req.user.id;
  const id = Number(req.params.id);

  // Ambil pesanan
  const pesanan = await prisma.pesanan.findFirst({
    where: { id, penggunaId },
    include: { pembayaran: true },
  });

  if (!pesanan) {
    return res.status(404).json({ message: "Pesanan tidak ditemukan" });
  }

  if (pesanan.status !== "MENUNGGU_PEMBAYARAN") {
    return res.status(400).json({
      message: "Pesanan tidak bisa dibayar pada status ini",
    });
  }

  try {
    const parameter = {
      transaction_details: {
        order_id: `ORDER-${pesanan.id}-${Date.now()}`,
        gross_amount: pesanan.total, // pastikan ada field total
      },
      customer_details: {
        first_name: req.user.nama || "Customer",
        email: req.user.email,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    // Simpan token ke database (opsional tapi disarankan)
    await prisma.pembayaran.update({
      where: { id: pesanan.pembayaran.id },
      data: {
        snapToken: transaction.token,
        status: "MENUNGGU_PEMBAYARAN",
      },
    });

    res.json({
      token: transaction.token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal membuat transaksi Midtrans" });
  }
});
export default router;