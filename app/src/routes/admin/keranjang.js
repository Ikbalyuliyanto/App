import express from "express";
import prisma from "../../prisma.js";

const router = express.Router();

// GET semua item keranjang milik user yang login
router.get("/", async (req, res) => {
  try {
    const penggunaId = req.user.id;

    const keranjang = await prisma.keranjang.findFirst({
      where: { penggunaId, aktif: true },
      include: { item: { include: { produk: true } } }
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

// POST /api/keranjang/item
// body: { produkId: number, varianId?: number|null, jumlah: number }

app.post("/api/keranjang/item", async (req, res) => {
  try {
    // ambil penggunaId dari auth-middleware kamu
    // contoh: req.user.id
    const penggunaId = req.user?.id;
    if (!penggunaId) return res.status(401).json({ message: "Unauthorized" });

    const { produkId, varianId = null, jumlah } = req.body;

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
      // 1) cari keranjang aktif, kalau tidak ada buat
      let keranjang = await tx.keranjang.findFirst({
        where: { penggunaId, aktif: true },
      });

      if (!keranjang) {
        keranjang = await tx.keranjang.create({
          data: { penggunaId, aktif: true },
        });
      }

      // 2) cari item existing (bedakan null dan non-null)
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

      return { keranjang, item };
    });

    return res.json(result);
  } catch (e) {
    console.error(e);
    // kalau kena unique error, biasanya Prisma code P2002
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
