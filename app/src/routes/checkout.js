import express from "express";
import prisma from "../prisma.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// ===============================
// Helpers
// ===============================
function computeExpiredAt(metode) {
  const now = Date.now();
  const m = String(metode || "").toUpperCase();

  if (m === "VA") return new Date(now + 24 * 60 * 60 * 1000); // 24 jam
  if (m === "EWALLET") return new Date(now + 30 * 60 * 1000); // 30 menit
  return null; // COD
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
    label,
    namaPenerima,
    noTelp,
    provinsi,
    kota,
    kecamatan,
    kelurahan,
    kodePos,
    alamat,
    latitude = null,
    longitude = null,
    mapsUrl = null,
    isUtama = false,
  } = req.body || {};

  if (
    !label || !namaPenerima || !noTelp ||
    !provinsi || !kota || !kecamatan || !kelurahan || !kodePos || !alamat
  ) {
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
      penggunaId,
      label,
      namaPenerima,
      noTelp,
      provinsi,
      kota,
      kecamatan,
      kelurahan,
      kodePos,
      alamat,
      latitude: latitude !== null ? Number(latitude) : null,
      longitude: longitude !== null ? Number(longitude) : null,
      mapsUrl: mapsUrl ? String(mapsUrl) : null,
      isUtama: Boolean(isUtama),
    },
  });

  res.json(created);
});
/**
 * PATCH /api/checkout/alamat/:id
 * Body: { label, namaPenerima, noTelp, provinsi, kota, kecamatan, kelurahan, kodePos, alamat, isUtama?, latitude?, longitude?, mapsUrl? }
 */
router.patch("/alamat/:id", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id = Number(req.params.id);

    const {
      label,
      namaPenerima,
      noTelp,
      provinsi,
      kota,
      kecamatan,
      kelurahan,
      kodePos,
      alamat,
      isUtama = false,
      latitude = null,
      longitude = null,
      mapsUrl = null,
    } = req.body || {};

    if (!id) return res.status(400).json({ message: "ID alamat tidak valid" });

    // pastikan alamat milik user
    const existing = await prisma.alamatPengguna.findFirst({
      where: { id, penggunaId },
    });
    if (!existing) return res.status(404).json({ message: "Alamat tidak ditemukan" });

    // validasi field minimal (sama seperti create)
    if (
      !label || !namaPenerima || !noTelp ||
      !provinsi || !kota || !kecamatan || !kelurahan || !kodePos || !alamat
    ) {
      return res.status(400).json({ message: "Field alamat belum lengkap" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // kalau set utama, matikan utama lainnya
      if (isUtama) {
        await tx.alamatPengguna.updateMany({
          where: { penggunaId, isUtama: true, NOT: { id } },
          data: { isUtama: false },
        });
      }

      return await tx.alamatPengguna.update({
        where: { id },
        data: {
          label,
          namaPenerima,
          noTelp,
          provinsi,
          kota,
          kecamatan,
          kelurahan,
          kodePos,
          alamat,
          isUtama: Boolean(isUtama),
          latitude,
          longitude,
          mapsUrl,
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
// POST /api/checkout
// body:
// { itemIds, addressId, layananId, voucherCode?, paymentMethod }
// ===============================
router.post("/", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;

    const {
      itemIds,
      addressId,
      layananId,
      voucherCode = null,
      paymentMethod,
    } = req.body || {};

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "itemIds wajib diisi" });
    }
    if (!addressId) return res.status(400).json({ message: "addressId wajib diisi" });
    if (!layananId) return res.status(400).json({ message: "layananId wajib diisi" });
    if (!paymentMethod) return res.status(400).json({ message: "paymentMethod wajib diisi" });

    const { metode, provider, pm } = mapPaymentMethod(paymentMethod);

    // ambil alamat milik user
    const alamat = await prisma.alamatPengguna.findFirst({
      where: { id: Number(addressId), penggunaId },
    });
    if (!alamat) return res.status(404).json({ message: "Alamat tidak ditemukan" });

    // ambil layanan pengiriman
    const layanan = await prisma.layananPengiriman.findFirst({
      where: { id: Number(layananId), aktif: true, kurir: { aktif: true } },
      include: { kurir: true },
    });
    if (!layanan) return res.status(404).json({ message: "Layanan pengiriman tidak ditemukan" });

    // ambil keranjang aktif user
    const keranjang = await prisma.keranjang.findFirst({
      where: { penggunaId, aktif: true },
      select: { id: true },
    });
    if (!keranjang) return res.status(400).json({ message: "Keranjang aktif tidak ditemukan" });

    // ambil item yang dipilih (PASTIKAN item itu milik keranjang user)
    const items = await prisma.itemKeranjang.findMany({
      where: {
        keranjangId: keranjang.id,
        id: { in: itemIds.map(Number) },
      },
      include: {
        produk: true,
        varian: true,
      },
    });

    if (!items.length) {
      return res.status(400).json({ message: "Item keranjang tidak ditemukan" });
    }

    // hitung subtotal
    let subtotal = 0;
    for (const it of items) {
      const harga = Number(it.varian?.harga ?? it.produk?.harga ?? 0);
      const qty = Number(it.jumlah || 1);
      subtotal += harga * qty;
    }

    // voucher (hardcode sesuai frontend)
    let diskonVoucher = 0;
    const code = String(voucherCode || "").trim().toUpperCase();
    if (code === "ZAWA50K") diskonVoucher = 50000;
    if (code === "ZAWA100K") diskonVoucher = 100000;

    const ongkir = layanan.gratis ? 0 : Number(layanan.harga || 0);
    const totalAkhir = Math.max(0, subtotal + ongkir - diskonVoucher);

    // STATUS awal pesanan
    // - COD: langsung DIPROSES (karena tidak perlu bayar)
    // - selain COD: MENUNGGU_PEMBAYARAN
    const statusAwal = (metode === "COD") ? "DIPROSES" : "MENUNGGU_PEMBAYARAN";

    const expiredAt = computeExpiredAt(metode);

    const result = await prisma.$transaction(async (tx) => {
      // create pesanan
      const pesanan = await tx.pesanan.create({
        data: {
          penggunaId,
          subtotal,
          ongkir,
          diskon: diskonVoucher,
          totalAkhir,
          status: statusAwal,

          // snapshot alamat
          namaPenerima: alamat.namaPenerima,
          noTelp: alamat.noTelp,
          alamat: alamat.alamat,
          kelurahan: alamat.kelurahan,
          kecamatan: alamat.kecamatan,
          kota: alamat.kota,
          provinsi: alamat.provinsi,
          kodePos: alamat.kodePos,

          item: {
            create: items.map((it) => ({
              produkId: it.produkId,
              varianId: it.varianId,
              jumlah: it.jumlah,
              harga: Number(it.varian?.harga ?? it.produk?.harga ?? 0),
            })),
          },
        },
      });

      // create pengiriman
      await tx.pengiriman.create({
        data: {
          pesananId: pesanan.id,
          layananId: layanan.id,
          biaya: ongkir,
        },
      });

      // create pembayaran
      // - COD boleh tetap dibuat sebagai BERHASIL atau MENUNGGU (tergantung design)
      //   paling gampang: COD => status BERHASIL + paidAt now (biar tidak nyangkut)
      //   atau: COD => MENUNGGU tapi pesanan sudah DIPROSES (ini juga oke)
      let pembayaranStatus = "MENUNGGU";
      let paidAt = null;

      if (metode === "COD") {
        pembayaranStatus = "BERHASIL";
        paidAt = new Date();
      }

      const pembayaran = await tx.pembayaran.create({
        data: {
          pesananId: pesanan.id,
          metode,       // VA | EWALLET | COD
          provider,     // BNI_VA / OVO / etc
          status: pembayaranStatus,
          amount: totalAkhir,
          fee: 0,
          expiredAt: expiredAt, // ✅ ini kunci expired
          paidAt: paidAt,
        },
      });

      // hapus item dari keranjang setelah order dibuat
      await tx.itemKeranjang.deleteMany({
        where: { id: { in: items.map((x) => x.id) } },
      });

      return { pesanan, pembayaran };
    });

    // response untuk frontend redirect:
    // - non COD: arahkan ke pembayaran.html?orderId=...
    // - COD: arahkan ke pesanan-detail.html?orderId=...
    const redirectUrl =
      metode === "COD"
        ? `/pesanan-detail.html?orderId=${result.pesanan.id}`
        : `/pembayaran.html?orderId=${result.pesanan.id}`;

    res.json({
      message: "Checkout berhasil",
      pesananId: result.pesanan.id,
      metode,
      provider,
      expiredAt: result.pembayaran.expiredAt,
      redirectUrl,
      pesanan: result.pesanan,
      pembayaran: result.pembayaran,
    });
  } catch (e) {
    console.error("POST /api/checkout error:", e);
    res.status(500).json({ message: "Checkout gagal" });
  }
});

// ⚠️ Saran: hapus route ini dan pindahkan ke pesanan.js
// router.get("/pesanan/:id", auth, ...) -> pindah ke /api/pesanan/:id

export default router;
