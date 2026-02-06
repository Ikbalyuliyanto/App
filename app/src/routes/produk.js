import express from "express";
import prisma from "../prisma.js";

const router = express.Router();

// LIST PRODUK (untuk publik biasanya filter aktif)
router.get("/", async (req, res) => {
  try {
    const data = await prisma.produk.findMany({
      where: { aktif: true }, // <- kalau endpoint publik, ini wajib biar yang nonaktif gak kebaca
      include: { kategori: true },
      orderBy: { id: "asc" },
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil produk", error: String(err) });
  }
});

// HOME SECTION: flashsale / terlaris / untukmu
router.get("/home/sections", async (req, res) => {
  try {
    const take = Math.min(Number(req.query.take || 10), 50);

    const [flashsale, terlaris, untukmu] = await Promise.all([
      prisma.produk.findMany({
        where: { aktif: true, flashsale: true },
        orderBy: { id: "desc" },
        take,
        include: { kategori: true }
      }),
      prisma.produk.findMany({
        where: { aktif: true, terlaris: true },
        orderBy: { id: "desc" },
        take,
        include: { kategori: true }
      }),
      prisma.produk.findMany({
        where: { aktif: true, untukmu: true },
        orderBy: { id: "desc" },
        take,
        include: { kategori: true }
      }),
    ]);

    res.json({ flashsale, terlaris, untukmu });
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil home sections", error: String(err) });
  }
});

// DETAIL PRODUK (hanya produk aktif)
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID tidak valid" });
    }

    const data = await prisma.produk.findUnique({
      where: { id },
      include: {
        kategori: true,
        galeri: { orderBy: { urutan: "asc" } },
        atributProduk: {
          orderBy: { urutan: "asc" },
          include: { nilai: { orderBy: { urutan: "asc" } } },
        },
        varianProduk: {
          include: {
            atribut: { include: { nilai: true } },
          },
        },
      },
    });

    if (!data || data.aktif !== true) {
      return res.status(404).json({ message: "Produk tidak ditemukan atau tidak aktif" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil detail produk", error: String(err) });
  }
});
export default router;