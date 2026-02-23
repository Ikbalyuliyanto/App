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
  // ✅ TAMBAHKAN INI
  pengembalian: {
    select: {
      id: true,
      jenis: true,
      status: true,
      alasan: true,
      resiKembali: true,
      dibuatPada: true,
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
        pengembalian: {
          select: {
            id: true,
            jenis: true,
            status: true,
            alasan: true,
            dibuatPada: true,
          },
        },
      },
    });

    const selesaiIds = data
      .filter(p => p.status === "SELESAI")
      .map(p => p.id);

    const ulasanAda = selesaiIds.length
      ? await prisma.ulasan.findMany({
          where: {
            pesananId: { in: selesaiIds },
            penggunaId,
          },
          select: { pesananId: true },
          distinct: ["pesananId"],
        })
      : [];

    const ulasanSet = new Set(ulasanAda.map(u => u.pesananId));

    const result = data.map(p => ({
      ...p,
      sudahDiulas: ulasanSet.has(p.id),
    }));

    res.json(result);
  } catch (e) {
    console.error("GET /api/pesanan error:", e);
    res.status(500).json({ message: "Gagal mengambil pesanan" });
  }
});
// router.get("/", auth, async (req, res) => {
//   try {
//     const penggunaId = req.user.id;

//     await prisma.$transaction(async (tx) => {
//       await autoExpirePayments(tx, penggunaId);
//     });

//     const data = await prisma.pesanan.findMany({
//       where: { penggunaId },
//       orderBy: { dibuatPada: "desc" },
//       select: {
//         id: true,
//         dibuatPada: true,
//         status: true,
//         subtotal: true,
//         ongkir: true,
//         diskon: true,
//         totalAkhir: true,
//         pembayaran: {
//           select: {
//             status: true,
//             metode: true,
//             provider: true,
//             expiredAt: true,
//             paidAt: true,
//             amount: true,
//           },
//         },
//         pengiriman: {
//           select: {
//             id: true,
//             layananId: true,
//             dibuatPada: true,
//             diubahPada: true,
//             layanan: {
//               select: {
//                 nama: true,
//                 estimasiHari: true,
//                 kurir: { select: { nama: true, kode: true } },
//               },
//             },
//           },
//         },
//       },
//     });

//     const selesaiIds = data
//       .filter(p => p.status === "SELESAI")
//       .map(p => p.id);

//     const ulasanAda = selesaiIds.length
//       ? await prisma.ulasan.findMany({
//           where: {
//             pesananId: { in: selesaiIds },
//             penggunaId,
//           },
//           select: { pesananId: true },
//           distinct: ["pesananId"],
//         })
//       : [];

//     const ulasanSet = new Set(ulasanAda.map(u => u.pesananId));

//     const result = data.map(p => ({
//       ...p,
//       sudahDiulas: ulasanSet.has(p.id),
//     }));

//     res.json(result);
//   } catch (e) {
//     console.error("GET /api/pesanan error:", e);
//     res.status(500).json({ message: "Gagal mengambil pesanan" });
//   }
// });
// router.get("/", auth, async (req, res) => {
//   try {
//     const penggunaId = req.user.id;

//     await prisma.$transaction(async (tx) => {
//       await autoExpirePayments(tx, penggunaId);
//     });

//     const data = await prisma.pesanan.findMany({
//       where: { penggunaId },
//       orderBy: { dibuatPada: "desc" },
//       select: {
//         id: true,
//         dibuatPada: true,
//         status: true,
//         subtotal: true,
//         ongkir: true,
//         diskon: true,
//         totalAkhir: true,
//         pembayaran: {
//           select: {
//             status: true,
//             metode: true,
//             provider: true,
//             expiredAt: true,
//             paidAt: true,
//             amount: true,
//           },
//         },
//         // ⚠️ jangan select field yang belum tentu ada di schema Pengiriman
//         pengiriman: {
//           select: {
//             id: true,
//             layananId: true,
//             dibuatPada: true,
//             diubahPada: true,
//             layanan: {
//               select: {
//                 nama: true,
//                 estimasiHari: true,
//                 kurir: { select: { nama: true, kode: true } },
//               },
//             },
//           },
//         },
//       },
//     });

//     res.json(data);
//   } catch (e) {
//     console.error("GET /api/pesanan error:", e);
//     res.status(500).json({ message: "Gagal mengambil pesanan" });
//   }
// });

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

router.patch("/:id/batal", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID pesanan tidak valid" });

    await prisma.$transaction(async (tx) => {
      // Auto expire pembayaran
      await autoExpirePayments(tx, penggunaId);

      // Ambil pesanan beserta item & pembayaran
      const pesanan = await tx.pesanan.findFirst({
        where: { id, penggunaId },
        include: { pembayaran: true, item: true },
      });

      if (!pesanan) throw { status: 404, message: "Pesanan tidak ditemukan" };

      // Simpan data item pesanan
      const itemsPesanan = pesanan.item.map((i) => ({
        produkId: i.produkId,
        varianId: i.varianId ?? null,
        jumlah: i.jumlah,
      }));

      // Ambil keranjang aktif pengguna
      const keranjang = await tx.keranjang.findFirst({ where: { penggunaId, aktif: true } });

      // ✅ Hanya kembalikan item jika status MENUNGGU_PEMBAYARAN / DIPROSES
      if (["MENUNGGU_PEMBAYARAN", "DIPROSES"].includes(pesanan.status) && keranjang) {
        for (const item of itemsPesanan) {
          const existing = await tx.itemKeranjang.findFirst({
            where: {
              keranjangId: keranjang.id,
              produkId: item.produkId,
              varianId: item.varianId,
            },
          });

          if (existing) {
            await tx.itemKeranjang.update({
              where: { id: existing.id },
              data: { jumlah: existing.jumlah + item.jumlah },
            });
          } else {
            await tx.itemKeranjang.create({
              data: {
                keranjangId: keranjang.id,
                produkId: item.produkId,
                varianId: item.varianId,
                jumlah: item.jumlah,
              },
            });
          }
        }
      }

      // Hapus pesanan, pengiriman, pembayaran jika status MENUNGGU_PEMBAYARAN / DIPROSES
      if (["MENUNGGU_PEMBAYARAN", "DIPROSES"].includes(pesanan.status)) {
        await tx.pengiriman.deleteMany({ where: { pesananId: id } });
        if (pesanan.pembayaran) {
          await tx.pembayaran.delete({ where: { id: pesanan.pembayaran.id } });
        }
        await tx.itemPesanan.deleteMany({ where: { pesananId: id } });
        await tx.pesanan.delete({ where: { id } });

        res.json({ message: "Pesanan dibatalkan, item dikembalikan ke keranjang" });
        return;
      }

      // Untuk status lain → batalkan pesanan & pembayaran
      await tx.pesanan.update({ where: { id }, data: { status: "DIBATALKAN" } });
      if (pesanan.pembayaran) {
        await tx.pembayaran.update({
          where: { id: pesanan.pembayaran.id },
          data: { status: "DIBATALKAN" },
        });
      }

      res.json({ message: "Pesanan dibatalkan" });
    });
  } catch (e) {
    console.error("PATCH /:id/batal error:", e);
    const status = e.status || 500;
    const message = e.message || "Gagal membatalkan pesanan";
    res.status(status).json({ message });
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
