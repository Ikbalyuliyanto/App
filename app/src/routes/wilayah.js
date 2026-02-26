import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/*
FORMAT YANG DIKIRIM KE FRONTEND:
{
  status: "success",
  data: [
    { code: "11", name: "ACEH" }
  ]
}
*/

// ============================
// GET PROVINCES
// ============================
router.get("/provinces", async (req, res) => {
  try {
    const result = await prisma.provinsi.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    });

    const data = result.map(p => ({
      code: p.id,
      name: p.nama,
    }));

    res.json({ status: "success", data });
  } catch (e) {
    console.error("GET PROVINCES ERROR:", e);
    res.status(500).json({
      status: "error",
      message: "Gagal ambil provinsi",
      data: [],
    });
  }
});

// ============================
// GET KABUPATEN BY PROVINCE
// ============================
router.get("/regencies/:provinceCode", async (req, res) => {
  try {
    const result = await prisma.kabupaten.findMany({
      where: { provinsiId: req.params.provinceCode },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    });

    const data = result.map(k => ({
      code: k.id,
      name: k.nama,
    }));

    res.json({ status: "success", data });
  } catch (e) {
    console.error("GET REGENCIES ERROR:", e);
    res.status(500).json({
      status: "error",
      message: "Gagal ambil kabupaten",
      data: [],
    });
  }
});

// ============================
// GET KECAMATAN BY KABUPATEN
// ============================
router.get("/districts/:regencyCode", async (req, res) => {
  try {
    const result = await prisma.kecamatan.findMany({
      where: { kabupatenId: req.params.regencyCode },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    });

    const data = result.map(d => ({
      code: d.id,
      name: d.nama,
    }));

    res.json({ status: "success", data });
  } catch (e) {
    console.error("GET DISTRICTS ERROR:", e);
    res.status(500).json({
      status: "error",
      message: "Gagal ambil kecamatan",
      data: [],
    });
  }
});

// ============================
// GET KELURAHAN BY KECAMATAN
// ============================
router.get("/villages/:districtCode", async (req, res) => {
  try {
    const result = await prisma.kelurahan.findMany({
      where: { kecamatanId: req.params.districtCode },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    });

    const data = result.map(v => ({
      code: v.id,
      name: v.nama,
    }));

    res.json({ status: "success", data });
  } catch (e) {
    console.error("GET VILLAGES ERROR:", e);
    res.status(500).json({
      status: "error",
      message: "Gagal ambil kelurahan",
      data: [],
    });
  }
});

export default router;