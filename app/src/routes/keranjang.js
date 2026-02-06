import express from "express";
import prisma from "../prisma.js";

const router = express.Router();

// GET semua item keranjang milik user yang login
router.get("/", async (req, res) => {
  try {
    const penggunaId = req.user.id;

    const keranjang = await prisma.keranjang.findFirst({
      where: { penggunaId, aktif: true },
      include: {
        item: {
          include: {
            produk: true,
            varian: {
              include: {
                atribut: {
                  include: {
                    nilai: {
                      include: {
                        atribut: true, // ✅ agar dapat nama atribut: Warna/Ukuran
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!keranjang) {
      return res.status(404).json({ message: "Keranjang tidak ditemukan" });
    }

    res.json(keranjang);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil data keranjang" });
  }
});

// ✅ POST tambah item ke keranjang
router.post("/item", async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const { produkId, varianId = null, jumlah = 1 } = req.body;

    const produkIdNum = Number(produkId);
    const varianIdNum = varianId === null || varianId === undefined ? null : Number(varianId);
    const jumlahNum = Number(jumlah);

    if (!Number.isInteger(produkIdNum) || produkIdNum <= 0) {
      return res.status(400).json({ message: "produkId tidak valid" });
    }
    if (!Number.isInteger(jumlahNum) || jumlahNum < 1) {
      return res.status(400).json({ message: "jumlah minimal 1" });
    }
    if (varianIdNum !== null && (!Number.isInteger(varianIdNum) || varianIdNum <= 0)) {
      return res.status(400).json({ message: "varianId tidak valid" });
    }

    const result = await prisma.$transaction(async (tx) => {
      let keranjang = await tx.keranjang.findFirst({
        where: { penggunaId, aktif: true },
      });

      if (!keranjang) {
        keranjang = await tx.keranjang.create({
          data: { penggunaId, aktif: true },
        });
      }

      // cari item existing (handle null varianId)
      const existing = await tx.itemKeranjang.findFirst({
        where: {
          keranjangId: keranjang.id,
          produkId: produkIdNum,
          ...(varianIdNum === null ? { varianId: null } : { varianId: varianIdNum }),
        },
      });

      let item;
      if (existing) {
        item = await tx.itemKeranjang.update({
          where: { id: existing.id },
          data: { jumlah: existing.jumlah + jumlahNum },
        });
      } else {
        item = await tx.itemKeranjang.create({
          data: {
            keranjangId: keranjang.id,
            produkId: produkIdNum,
            varianId: varianIdNum,
            jumlah: jumlahNum,
          },
        });
      }

      const keranjangFull = await tx.keranjang.findUnique({
      where: { id: keranjang.id },
      include: {
        item: {
          include: {
            produk: true,
            varian: {
              include: {
                atribut: {
                  include: {
                    nilai: {
                      include: {
                        atribut: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });


      return keranjangFull;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal menambah item keranjang" });
  }
});
// PATCH update jumlah item
router.patch("/item/:id", async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id = Number(req.params.id);
    const { jumlah } = req.body;

    const jumlahNum = Number(jumlah);
    if (!Number.isInteger(jumlahNum) || jumlahNum < 1) {
      return res.status(400).json({ message: "jumlah minimal 1" });
    }

    // pastikan item milik user ini
    const keranjang = await prisma.keranjang.findFirst({
      where: { penggunaId, aktif: true },
      select: { id: true },
    });
    if (!keranjang) return res.status(404).json({ message: "Keranjang tidak ditemukan" });

    const item = await prisma.itemKeranjang.updateMany({
      where: { id, keranjangId: keranjang.id },
      data: { jumlah: jumlahNum },
    });

    if (!item.count) return res.status(404).json({ message: "Item tidak ditemukan" });

    res.json({ message: "OK" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Gagal update item" });
  }
});

// DELETE hapus item
router.delete("/item/:id", async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id = Number(req.params.id);

    const keranjang = await prisma.keranjang.findFirst({
      where: { penggunaId, aktif: true },
      select: { id: true },
    });
    if (!keranjang) return res.status(404).json({ message: "Keranjang tidak ditemukan" });

    const del = await prisma.itemKeranjang.deleteMany({
      where: { id, keranjangId: keranjang.id },
    });

    if (!del.count) return res.status(404).json({ message: "Item tidak ditemukan" });

    res.json({ message: "OK" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Gagal hapus item" });
  }
});
router.get("/debug", async (req, res) => {
  try {
    const penggunaId = req.user.id;

    const keranjang = await prisma.keranjang.findFirst({
      where: { penggunaId, aktif: true },
      select: {
        id: true,
        penggunaId: true,
        item: {
          select: {
            id: true,
            produkId: true,
            varianId: true,
            jumlah: true,
          }
        }
      }
    });

    if (!keranjang) return res.json({ keranjang: null });

    // ambil detail varian untuk semua varianId yang ada
    const varianIds = keranjang.item.map(i => i.varianId).filter(Boolean);

    const varian = await prisma.produkVarian.findMany({
      where: { id: { in: varianIds } },
      include: {
        atribut: {
          include: {
            nilai: { include: { atribut: true } }
          }
        }
      }
    });

    res.json({ keranjang, varian });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "debug error" });
  }
});

export default router;