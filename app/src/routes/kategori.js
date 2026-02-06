import express from "express";
import prisma from "../prisma.js";

const router = express.Router();

// GET /api/kategori  -> semua kategori
// optional query:
// /api/kategori?header=true
// /api/kategori?body=true
router.get("/", async (req, res) => {
  try {
    const { header, body } = req.query;

    const where = {};
    if (header !== undefined) where.header = String(header) === "true";
    if (body !== undefined) where.body = String(body) === "true";

    const data = await prisma.kategori.findMany({
      where,
      orderBy: { id: "asc" },
    });

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Gagal ambil kategori" });
  }
});

export default router;
