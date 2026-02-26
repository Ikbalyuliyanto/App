import express from "express";
import prisma from "../prisma.js";
import auth from "../middleware/auth.js";
import midtransClient from "midtrans-client";
import crypto from "crypto";

const snap = new midtransClient.Snap({
  isProduction: process.env.IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});
const midtransSnapUrl = process.env.IS_PRODUCTION === "true"
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";
  
const router = express.Router();

// ─── GET ALL ───────────────────────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  const data = await prisma.pembayaran.findMany();
  res.json(data);
});

// ─── GET DETAIL PESANAN ────────────────────────────────────────────────────────
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

// ─── BATALKAN ─────────────────────────────────────────────────────────────────
router.patch("/:id/batalkan", auth, async (req, res) => {
  const penggunaId = req.user.id;
  const id = Number(req.params.id);
  const pesanan = await prisma.pesanan.findFirst({ where: { id, penggunaId }, include: { pembayaran: true } });
  if (!pesanan) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
  if (pesanan.status !== "MENUNGGU_PEMBAYARAN" && pesanan.status !== "DIPROSES") {
    return res.status(400).json({ message: "Pesanan tidak bisa dibatalkan pada status ini" });
  }
  await prisma.$transaction(async (tx) => {
    await tx.pesanan.update({ where: { id }, data: { status: "DIBATALKAN" } });
    if (pesanan.pembayaran) {
      await tx.pembayaran.update({ where: { id: pesanan.pembayaran.id }, data: { status: "DIBATALKAN" } });
    }
  });
  res.json({ message: "Pesanan berhasil dibatalkan" });
});

// ─── BUAT TRANSAKSI SNAP ───────────────────────────────────────────────────────
router.post("/:id/bayar", auth, async (req, res) => {
  const penggunaId = req.user.id;
  const id = Number(req.params.id);

  const pesanan = await prisma.pesanan.findFirst({
    where: { id, penggunaId },
    include: { pembayaran: true },
  });

  if (!pesanan) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
  if (pesanan.status !== "MENUNGGU_PEMBAYARAN") {
    return res.status(400).json({ message: "Pesanan tidak bisa dibayar pada status ini" });
  }

  // ✅ Cek apakah sudah dibayar di Midtrans (walau DB belum update)
  if (pesanan.pembayaran?.midtransOrderId) {
    try {
      const statusRes = await fetch(
        `${midtransSnapUrl}/v2/${pesanan.pembayaran.midtransOrderId}/status`,
        {
          headers: {
            Authorization: "Basic " + Buffer.from(process.env.MIDTRANS_SERVER_KEY + ":").toString("base64"),
          },
        }
      );
      const statusData = await statusRes.json();
      const txStatus = statusData.transaction_status;

      console.log(`🔍 Cek sebelum bayar pesanan #${id}: ${txStatus}`);

      // Kalau sudah settlement/capture → update DB dan return berhasil
      if (txStatus === "settlement" || (txStatus === "capture" && statusData.fraud_status !== "challenge")) {
        await prisma.$transaction(async (tx) => {
          await tx.pembayaran.update({
            where: { id: pesanan.pembayaran.id },
            data: { status: "BERHASIL", paidAt: new Date() },
          });
          await tx.pesanan.update({
            where: { id: pesanan.id },
            data: { status: "DIPROSES" },
          });
        });
        console.log(`✅ Pesanan #${id} sudah dibayar, DB diupdate`);
        return res.json({ alreadyPaid: true });
      }
    } catch (e) {
      console.warn("Gagal cek status sebelum bayar:", e.message);
    }
  }

  // Buat transaksi baru (logika awal)
  try {
    const grossAmount     = pesanan.totalAkhir ?? pesanan.subtotal ?? 0;
    const midtransOrderId = `ORDER-${pesanan.id}-${Date.now()}`;

    const transaction = await snap.createTransaction({
      transaction_details: { order_id: midtransOrderId, gross_amount: grossAmount },
      customer_details: {
        first_name: pesanan.namaPenerima || req.user.nama || "Customer",
        email:      req.user.email || "",
      },
    });

    await prisma.pembayaran.update({
      where: { id: pesanan.pembayaran.id },
      data: {
        snapToken:       transaction.token,
        midtransOrderId: midtransOrderId,
        status:          "MENUNGGU",
      },
    });

    console.log(`✅ Transaksi baru dibuat: ${midtransOrderId}`);
    res.json({ snapToken: transaction.token });
  } catch (error) {
    console.error("Midtrans error:", error);
    res.status(500).json({ message: "Gagal membuat transaksi Midtrans" });
  }
});
// router.post("/:id/bayar", auth, async (req, res) => {
//   const penggunaId = req.user.id;
//   const id = Number(req.params.id);

//   const pesanan = await prisma.pesanan.findFirst({
//     where: { id, penggunaId },
//     include: { pembayaran: true },
//   });

//   if (!pesanan) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
//   if (pesanan.status !== "MENUNGGU_PEMBAYARAN") {
//     return res.status(400).json({ message: "Pesanan tidak bisa dibayar pada status ini" });
//   }

//   try {
//     const grossAmount     = pesanan.totalAkhir ?? pesanan.subtotal ?? 0;
//     const midtransOrderId = `ORDER-${pesanan.id}-${Date.now()}`;

//     const transaction = await snap.createTransaction({
//       transaction_details: { order_id: midtransOrderId, gross_amount: grossAmount },
//       customer_details: {
//         first_name: pesanan.namaPenerima || req.user.nama || "Customer",
//         email:      req.user.email || "",
//       },
//     });

//     // ✅ Simpan snapToken DAN midtransOrderId sekaligus dalam satu update
//     await prisma.pembayaran.update({
//       where: { id: pesanan.pembayaran.id },
//       data: {
//         snapToken:       transaction.token,
//         midtransOrderId: midtransOrderId,
//         status:          "MENUNGGU",
//       },
//     });

//     res.json({ snapToken: transaction.token });
//   } catch (error) {
//     console.error("Midtrans error:", error);
//     res.status(500).json({ message: "Gagal membuat transaksi Midtrans" });
//   }
// });

// ─── KONFIRMASI SETELAH onSuccess ─────────────────────────────────────────────
// Frontend panggil ini setelah Snap popup onSuccess
// midtransOrderId diambil dari DB, bukan dari frontend (lebih aman)
router.post("/:id/konfirmasi", auth, async (req, res) => {
  const penggunaId = req.user.id;
  const id = Number(req.params.id);

  const pesanan = await prisma.pesanan.findFirst({
    where: { id, penggunaId },
    include: { pembayaran: true },
  });

  if (!pesanan)           return res.status(404).json({ message: "Pesanan tidak ditemukan" });
  if (!pesanan.pembayaran) return res.status(404).json({ message: "Data pembayaran tidak ditemukan" });

  // ✅ Ambil midtransOrderId dari DB — tidak butuh dari frontend
  const midtransOrderId = pesanan.pembayaran.midtransOrderId;
  if (!midtransOrderId) {
    return res.status(400).json({ message: "midtransOrderId belum tersimpan, coba bayar ulang" });
  }

  try {
    const statusRes = await fetch(
      `${midtransSnapUrl}/v2/${midtransOrderId}/status`,
      {
        headers: {
          Authorization: "Basic " + Buffer.from(process.env.MIDTRANS_SERVER_KEY + ":").toString("base64"),
        },
      }
    );
    const statusData = await statusRes.json();
    const newStatus  = mapMidtransStatus(statusData.transaction_status, statusData.fraud_status);

    // console.log(`🔍 Konfirmasi #${id}: ${statusData.transaction_status} → ${newStatus}`);

    if (newStatus === "BERHASIL") {
      await prisma.$transaction(async (tx) => {
        await tx.pembayaran.update({
          where: { id: pesanan.pembayaran.id },
          data: { status: "BERHASIL", paidAt: new Date() },
        });
        await tx.pesanan.update({
          where: { id: pesanan.id },
          data: { status: "DIPROSES" },
        });
      });
      console.log(`✅ Pesanan #${id} → BERHASIL / DIPROSES`);
    }

    res.json({ status: newStatus });
  } catch (err) {
    console.error("Konfirmasi error:", err);
    res.status(500).json({ message: "Gagal verifikasi ke Midtrans" });
  }
});

// ─── WEBHOOK MIDTRANS ──────────────────────────────────────────────────────────
router.post("/midtrans/notification", async (req, res) => {
  try {
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = req.body;

    const expectedSig = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
      .digest("hex");

    if (signature_key !== expectedSig) {
      console.warn("❌ Signature tidak valid:", order_id);
      return res.status(403).json({ message: "Signature tidak valid" });
    }

    const pembayaran = await prisma.pembayaran.findFirst({
      where: { midtransOrderId: order_id },
      include: { pesanan: true },
    });

    if (!pembayaran) {
      console.warn("❌ Pembayaran tidak ditemukan:", order_id);
      return res.status(404).json({ message: "Pembayaran tidak ditemukan" });
    }

    const newStatusPembayaran = mapMidtransStatus(transaction_status, fraud_status);
    const newStatusPesanan    = newStatusPembayaran === "BERHASIL" ? "DIPROSES"
      : (newStatusPembayaran === "GAGAL" || newStatusPembayaran === "KADALUARSA") ? "DIBATALKAN"
      : pembayaran.pesanan.status;

    await prisma.$transaction(async (tx) => {
      await tx.pembayaran.update({
        where: { id: pembayaran.id },
        data: { status: newStatusPembayaran, paidAt: newStatusPembayaran === "BERHASIL" ? new Date() : undefined },
      });
      if (newStatusPesanan !== pembayaran.pesanan.status) {
        await tx.pesanan.update({ where: { id: pembayaran.pesananId }, data: { status: newStatusPesanan } });
      }
    });

    console.log(`✅ Webhook: pesanan #${pembayaran.pesananId} → ${newStatusPembayaran}`);
    res.json({ message: "OK" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── HELPER ───────────────────────────────────────────────────────────────────
function mapMidtransStatus(transactionStatus, fraudStatus) {
  if (transactionStatus === "capture")    return fraudStatus === "challenge" ? "MENUNGGU" : "BERHASIL";
  if (transactionStatus === "settlement") return "BERHASIL";
  if (transactionStatus === "pending")    return "MENUNGGU";
  if (["deny", "cancel", "failure"].includes(transactionStatus)) return "GAGAL";
  if (transactionStatus === "expire")     return "KADALUARSA";
  return "MENUNGGU";
}

export default router;