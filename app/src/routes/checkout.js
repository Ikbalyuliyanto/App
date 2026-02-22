import express from "express";
import midtransClient from "midtrans-client";
import prisma from "../prisma.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// ===============================
// Midtrans Snap Instance
// ===============================
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// ===============================
// Helpers
// ===============================
function computeExpiredAt(metode) {
  const now = Date.now();
  const m = String(metode || "").toUpperCase();
  if (m === "VA") return new Date(now + 24 * 60 * 60 * 1000);
  if (m === "EWALLET") return new Date(now + 30 * 60 * 1000);
  return null;
}

function mapPaymentMethod(paymentMethod) {
  const pm = String(paymentMethod || "").toLowerCase();
  let metode = "VA";
  let provider = null;

  if (pm === "cod") {
    metode = "COD";
  } else if (["gopay", "ovo", "dana"].includes(pm)) {
    metode = "EWALLET";
    provider = pm.toUpperCase();
  } else if (["bca", "bni", "mandiri"].includes(pm)) {
    metode = "VA";
    provider = `${pm.toUpperCase()}_VA`;
  } else if (pm === "online") {
    // Midtrans Snap (semua metode)
    metode = "ONLINE";
    provider = "MIDTRANS";
  } else {
    metode = "VA";
    provider = pm ? pm.toUpperCase() : null;
  }

  return { metode, provider, pm };
}

// ===============================
// GET /api/checkout
// ===============================
router.get("/", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;

    const [alamat, layanan, keranjang] = await Promise.all([
      prisma.alamatPengguna.findMany({
        where: { penggunaId },
        orderBy: [{ isUtama: "desc" }, { diubahPada: "desc" }],
      }),
      prisma.layananPengiriman.findMany({
        where: { aktif: true, kurir: { aktif: true } },
        include: { kurir: true },
        orderBy: [{ gratis: "desc" }, { harga: "asc" }],
      }),
      prisma.keranjang.findFirst({
        where: { penggunaId, aktif: true },
        include: {
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
        },
      }),
    ]);

    res.json({
      alamat,
      layananPengiriman: layanan,
      keranjang: keranjang || { item: [] },
    });
  } catch (e) {
    console.error("GET /api/checkout error:", e);
    res.status(500).json({ message: "Gagal mengambil data checkout" });
  }
});

// ===============================
// POST /api/checkout/alamat
// ===============================
router.post("/alamat", auth, async (req, res) => {
  const penggunaId = req.user.id;
  const {
    label, namaPenerima, noTelp,
    provinsi, kota, kecamatan, kelurahan,
    kodePos, alamat,
    latitude = null, longitude = null, mapsUrl = null,
    isUtama = false,
  } = req.body || {};

  if (!label || !namaPenerima || !noTelp || !provinsi || !kota ||
      !kecamatan || !kelurahan || !kodePos || !alamat) {
    return res.status(400).json({ message: "Field alamat belum lengkap" });
  }

  if (isUtama) {
    await prisma.alamatPengguna.updateMany({
      where: { penggunaId, isUtama: true },
      data: { isUtama: false },
    });
  }

  const created = await prisma.alamatPengguna.create({
    data: {
      penggunaId, label, namaPenerima, noTelp,
      provinsi, kota, kecamatan, kelurahan, kodePos, alamat,
      latitude: latitude !== null ? Number(latitude) : null,
      longitude: longitude !== null ? Number(longitude) : null,
      mapsUrl: mapsUrl ? String(mapsUrl) : null,
      isUtama: Boolean(isUtama),
    },
  });

  res.json(created);
});

// ===============================
// PATCH /api/checkout/alamat/:id
// ===============================
router.patch("/alamat/:id", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id = Number(req.params.id);
    const {
      label, namaPenerima, noTelp,
      provinsi, kota, kecamatan, kelurahan,
      kodePos, alamat,
      isUtama = false,
      latitude = null, longitude = null, mapsUrl = null,
    } = req.body || {};

    if (!id) return res.status(400).json({ message: "ID alamat tidak valid" });

    const existing = await prisma.alamatPengguna.findFirst({
      where: { id, penggunaId },
    });
    if (!existing) return res.status(404).json({ message: "Alamat tidak ditemukan" });

    if (!label || !namaPenerima || !noTelp || !provinsi || !kota ||
        !kecamatan || !kelurahan || !kodePos || !alamat) {
      return res.status(400).json({ message: "Field alamat belum lengkap" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (isUtama) {
        await tx.alamatPengguna.updateMany({
          where: { penggunaId, isUtama: true, NOT: { id } },
          data: { isUtama: false },
        });
      }
      return await tx.alamatPengguna.update({
        where: { id },
        data: {
          label, namaPenerima, noTelp,
          provinsi, kota, kecamatan, kelurahan, kodePos, alamat,
          isUtama: Boolean(isUtama),
          latitude, longitude, mapsUrl,
        },
      });
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengubah alamat" });
  }
});

// ===============================
// GET /api/checkout/pengiriman
// ===============================
router.get("/pengiriman", async (req, res) => {
  try {
    const layanan = await prisma.layananPengiriman.findMany({
      where: { aktif: true, kurir: { aktif: true } },
      include: { kurir: true },
      orderBy: [{ gratis: "desc" }, { harga: "asc" }],
    });
    res.json(layanan);
  } catch (e) {
    console.error("GET /api/checkout/pengiriman error:", e);
    res.status(500).json({ message: "Gagal mengambil layanan pengiriman" });
  }
});

// ===============================
// POST /api/checkout  ← MAIN CHECKOUT
// ===============================
router.post("/", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const {
      itemIds, addressId, layananId,
      voucherCode = null, paymentMethod,
    } = req.body || {};

    // Validasi input
    if (!Array.isArray(itemIds) || !itemIds.length)
      return res.status(400).json({ message: "itemIds wajib diisi" });
    if (!addressId)
      return res.status(400).json({ message: "addressId wajib diisi" });
    if (!layananId)
      return res.status(400).json({ message: "layananId wajib diisi" });
    if (!paymentMethod)
      return res.status(400).json({ message: "paymentMethod wajib diisi" });

    const { metode, provider } = mapPaymentMethod(paymentMethod);

    // Ambil data yang dibutuhkan
    const [alamat, layanan, keranjang] = await Promise.all([
      prisma.alamatPengguna.findFirst({ where: { id: Number(addressId), penggunaId } }),
      prisma.layananPengiriman.findFirst({
        where: { id: Number(layananId), aktif: true, kurir: { aktif: true } },
        include: { kurir: true },
      }),
      prisma.keranjang.findFirst({
        where: { penggunaId, aktif: true },
        select: { id: true },
      }),
    ]);

    if (!alamat)    return res.status(404).json({ message: "Alamat tidak ditemukan" });
    if (!layanan)   return res.status(404).json({ message: "Layanan pengiriman tidak ditemukan" });
    if (!keranjang) return res.status(400).json({ message: "Keranjang aktif tidak ditemukan" });

    // Ambil item keranjang
    const items = await prisma.itemKeranjang.findMany({
      where: { keranjangId: keranjang.id, id: { in: itemIds.map(Number) } },
      include: { produk: true, varian: true },
    });

    if (!items.length)
      return res.status(400).json({ message: "Item keranjang tidak ditemukan" });

    // Hitung subtotal
    let subtotal = 0;
    for (const it of items) {
      const harga = Number(it.varian?.harga ?? it.produk?.harga ?? 0);
      subtotal += harga * Number(it.jumlah || 1);
    }

    // Voucher
    let diskonVoucher = 0;
    const code = String(voucherCode || "").trim().toUpperCase();
    if (code === "ZAWA50K")  diskonVoucher = 50000;
    if (code === "ZAWA100K") diskonVoucher = 100000;

    const ongkir     = layanan.gratis ? 0 : Number(layanan.harga || 0);
    const totalAkhir = Math.max(0, subtotal + ongkir - diskonVoucher);
    const statusAwal = metode === "COD" ? "DIPROSES" : "MENUNGGU_PEMBAYARAN";
    const expiredAt  = computeExpiredAt(metode);

    // Buat pesanan dalam transaksi
    const result = await prisma.$transaction(async (tx) => {
      const pesanan = await tx.pesanan.create({
        data: {
          penggunaId, subtotal, ongkir,
          diskon: diskonVoucher, totalAkhir, status: statusAwal,
          namaPenerima: alamat.namaPenerima,
          noTelp:       alamat.noTelp,
          alamat:       alamat.alamat,
          kelurahan:    alamat.kelurahan,
          kecamatan:    alamat.kecamatan,
          kota:         alamat.kota,
          provinsi:     alamat.provinsi,
          kodePos:      alamat.kodePos,
          item: {
            create: items.map((it) => ({
              produkId: it.produkId,
              varianId: it.varianId,
              jumlah:   it.jumlah,
              harga:    Number(it.varian?.harga ?? it.produk?.harga ?? 0),
            })),
          },
        },
        include: {
          item: { include: { produk: true, varian: true } },
        },
      });

      await tx.pengiriman.create({
        data: { pesananId: pesanan.id, layananId: layanan.id, biaya: ongkir },
      });

      const pembayaran = await tx.pembayaran.create({
        data: {
          pesananId: pesanan.id,
          metode,
          provider,
          status:    metode === "COD" ? "BERHASIL" : "MENUNGGU",
          amount:    totalAkhir,
          fee:       0,
          expiredAt: expiredAt,
          paidAt:    metode === "COD" ? new Date() : null,
        },
      });

      await tx.itemKeranjang.deleteMany({
        where: { id: { in: items.map((x) => x.id) } },
      });

      return { pesanan, pembayaran };
    });

    // ─── Jika ONLINE → generate Midtrans Snap Token ───────────────────
    let snapToken = null;
    let snapRedirectUrl = null;

    if (metode === "ONLINE") {
      try {
        const orderId = `ORDER-${result.pesanan.id}-${Date.now()}`;

        // Siapkan item details untuk Midtrans
        const itemDetails = result.pesanan.item.map((it) => ({
          id:       String(it.produkId),
          price:    Number(it.varian?.harga ?? it.produk?.harga ?? 0),
          quantity: Number(it.jumlah),
          name:     String(it.produk?.nama || "Produk").slice(0, 50),
        }));

        // Tambah ongkir jika ada
        if (ongkir > 0) {
          itemDetails.push({
            id:       "ONGKIR",
            price:    ongkir,
            quantity: 1,
            name:     `Ongkos Kirim (${layanan.nama})`,
          });
        }

        // Kurangi voucher jika ada
        if (diskonVoucher > 0) {
          itemDetails.push({
            id:       "VOUCHER",
            price:    -diskonVoucher,
            quantity: 1,
            name:     `Diskon Voucher (${code})`,
          });
        }

        const snapParameter = {
          transaction_details: {
            order_id:    orderId,
            gross_amount: totalAkhir,
          },
          customer_details: {
            first_name: alamat.namaPenerima,
            phone:      alamat.noTelp,
            email:      req.user.email || "",
            billing_address: {
              first_name: alamat.namaPenerima,
              phone:      alamat.noTelp,
              address:    alamat.alamat,
              city:       alamat.kota,
              postal_code: alamat.kodePos,
              country_code: "IDN",
            },
            shipping_address: {
              first_name: alamat.namaPenerima,
              phone:      alamat.noTelp,
              address:    alamat.alamat,
              city:       alamat.kota,
              postal_code: alamat.kodePos,
              country_code: "IDN",
            },
          },
          item_details: itemDetails,
          // Aktifkan semua metode pembayaran yang diinginkan
          enabled_payments: [
            "credit_card",
            "bca_va", "bni_va", "bri_va", "mandiri_bill", "permata_va", "other_va",
            "gopay", "shopeepay", "dana", "ovo",
            "qris",
            "indomaret", "alfamart",
          ],
          callbacks: {
            finish: `${process.env.APP_URL}/pembayaran.html?orderId=${result.pesanan.id}`,
          },
        };

        const transaction = await snap.createTransaction(snapParameter);
        snapToken       = transaction.token;
        snapRedirectUrl = transaction.redirect_url;

        // Simpan snap token ke DB
        await prisma.pembayaran.update({
          where: { id: result.pembayaran.id },
          data: {
            snapToken:  snapToken,
            // Simpan orderId Midtrans agar bisa dipakai untuk cek status
            provider:   orderId,
          },
        });
      } catch (midtransErr) {
        console.error("Midtrans error:", midtransErr);
        // Pesanan tetap dibuat, tapi token gagal → kasih tahu frontend
        return res.status(502).json({
          message: "Pesanan dibuat tapi gagal generate token pembayaran. Coba bayar ulang.",
          pesananId: result.pesanan.id,
        });
      }
    }

    // ─── Response ─────────────────────────────────────────────────────
    const redirectUrl =
      metode === "COD"
        ? `/pesanan-detail.html?orderId=${result.pesanan.id}`
        : `/pembayaran.html?orderId=${result.pesanan.id}`;

    res.json({
      message:     "Checkout berhasil",
      pesananId:   result.pesanan.id,
      metode,
      provider,
      expiredAt:   result.pembayaran.expiredAt,
      redirectUrl,
      snapToken,        // ← untuk Midtrans Snap popup
      snapRedirectUrl,  // ← fallback redirect ke halaman Midtrans
      pesanan:     result.pesanan,
      pembayaran:  result.pembayaran,
    });
  } catch (e) {
    console.error("POST /api/checkout error:", e);
    res.status(500).json({ message: "Checkout gagal" });
  }
});

// ===============================
// POST /api/checkout/:id/bayar
// (Bayar ulang / generate snap token lagi)
// ===============================
router.post("/:id/bayar", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id = Number(req.params.id);

    const pesanan = await prisma.pesanan.findFirst({
      where: { id, penggunaId },
      include: {
        pembayaran: true,
        item: { include: { produk: true, varian: true } },
      },
    });

    if (!pesanan)
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    if (pesanan.status !== "MENUNGGU_PEMBAYARAN")
      return res.status(400).json({ message: "Pesanan tidak bisa dibayar pada status ini" });
    if (!pesanan.pembayaran)
      return res.status(400).json({ message: "Data pembayaran tidak ditemukan" });

    // Jika token masih ada, kembalikan langsung
    if (pesanan.pembayaran.snapToken) {
      return res.json({ snapToken: pesanan.pembayaran.snapToken });
    }

    // Generate token baru
    const orderId = `ORDER-${pesanan.id}-${Date.now()}`;

    const itemDetails = pesanan.item.map((it) => ({
      id:       String(it.produkId),
      price:    Number(it.harga),
      quantity: Number(it.jumlah),
      name:     String(it.produk?.nama || "Produk").slice(0, 50),
    }));

    if (Number(pesanan.ongkir) > 0) {
      itemDetails.push({
        id: "ONGKIR", price: Number(pesanan.ongkir),
        quantity: 1, name: "Ongkos Kirim",
      });
    }
    if (Number(pesanan.diskon) > 0) {
      itemDetails.push({
        id: "VOUCHER", price: -Number(pesanan.diskon),
        quantity: 1, name: "Diskon Voucher",
      });
    }

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id:     orderId,
        gross_amount: Number(pesanan.totalAkhir),
      },
      customer_details: {
        first_name: pesanan.namaPenerima,
        phone:      pesanan.noTelp,
        email:      req.user.email || "",
      },
      item_details: itemDetails,
      callbacks: {
        finish: `${process.env.APP_URL}/pembayaran.html?orderId=${pesanan.id}`,
      },
    });

    await prisma.pembayaran.update({
      where: { id: pesanan.pembayaran.id },
      data: { snapToken: transaction.token, provider: orderId },
    });

    res.json({ snapToken: transaction.token });
  } catch (e) {
    console.error("POST /:id/bayar error:", e);
    res.status(500).json({ message: "Gagal membuat transaksi Midtrans" });
  }
});

// ===============================
// POST /api/checkout/midtrans/notification
// (Webhook dari Midtrans)
// ===============================
router.post("/midtrans/notification", async (req, res) => {
  try {
    const notification = req.body;

    // Verifikasi signature dari Midtrans
    const statusResponse = await snap.transaction.notification(notification);

    const orderId         = statusResponse.order_id;          // FORMAT: ORDER-{pesananId}-{timestamp}
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus     = statusResponse.fraud_status;
    const paymentType     = statusResponse.payment_type;

    // Ekstrak pesananId dari orderId
    const pesananId = Number(String(orderId).split("-")[1]);
    if (!pesananId) return res.status(400).json({ message: "orderId tidak valid" });

    const pembayaran = await prisma.pembayaran.findFirst({
      where: { pesananId },
    });
    if (!pembayaran) return res.status(404).json({ message: "Pembayaran tidak ditemukan" });

    // Tentukan status baru
    let statusBaru       = null;
    let pesananStatusBaru = null;
    let paidAt           = null;

    if (transactionStatus === "capture") {
      if (fraudStatus === "accept") {
        statusBaru       = "BERHASIL";
        pesananStatusBaru = "DIPROSES";
        paidAt           = new Date();
      } else if (fraudStatus === "challenge") {
        statusBaru = "PENDING";
      }
    } else if (transactionStatus === "settlement") {
      statusBaru       = "BERHASIL";
      pesananStatusBaru = "DIPROSES";
      paidAt           = new Date();
    } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
      statusBaru       = "GAGAL";
      pesananStatusBaru = "DIBATALKAN";
    } else if (transactionStatus === "pending") {
      statusBaru = "MENUNGGU";
    }

    if (statusBaru) {
      await prisma.$transaction(async (tx) => {
        await tx.pembayaran.update({
          where: { id: pembayaran.id },
          data: {
            status:      statusBaru,
            paidAt:      paidAt,
            metode:      paymentType || pembayaran.metode,
          },
        });

        if (pesananStatusBaru) {
          await tx.pesanan.update({
            where: { id: pesananId },
            data:  { status: pesananStatusBaru },
          });
        }
      });
    }

    res.status(200).json({ message: "OK" });
  } catch (e) {
    console.error("Midtrans notification error:", e);
    res.status(500).json({ message: "Gagal proses notifikasi" });
  }
});

export default router;