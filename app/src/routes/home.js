import express from "express";
import prisma from "../prisma.js";

const router = express.Router();

/**
 * GET /api/home
 * Query:
 *  - take = jumlah produk per section (default 10, max 50)
 *
 * Return:
 * {
 *   categories: {
 *     header: [...],
 *     body: [...]
 *   },
 *   products: {
 *     flashsale: [...],
 *     terlaris: [...],
 *     untukmu: [...]
 *   }
 * }
 */
router.get("/", async (req, res) => {
  try {
    const take = Math.min(Number(req.query.take || 10), 50);

    const [
      headerCategories,
      bodyCategories,
      flashsale,
      terlaris,
      untukmu,
    ] = await Promise.all([
      prisma.kategori.findMany({
        where: { header: true },
        orderBy: { id: "asc" },
      }),
      prisma.kategori.findMany({
        where: { body: true },
        orderBy: { id: "asc" },
      }),
      prisma.produk.findMany({
        where: { aktif: true, flashsale: true },
        include: { kategori: true },
        orderBy: { id: "desc" },
        take,
      }),
      prisma.produk.findMany({
        where: { aktif: true, terlaris: true },
        include: { kategori: true },
        orderBy: { id: "desc" },
        take,
      }),
      prisma.produk.findMany({
        where: { aktif: true, untukmu: true },
        include: { kategori: true },
        orderBy: { id: "desc" },
        take,
      }),
    ]);

    res.json({
      categories: {
        header: headerCategories,
        body: bodyCategories,
      },
      products: {
        flashsale,
        terlaris,
        untukmu,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Gagal ambil data home",
      error: String(err),
    });
  }
});

export default router;
