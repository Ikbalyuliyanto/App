import express from "express";
import prisma from "../prisma.js";
// ^^^ GANTI sesuai file prisma kamu. Contoh lain:
// import prisma from "../utils/prisma.js";

const router = express.Router();

/**
 * GET /api/pengguna/me
 * return: { id, email, peran, profil }
 */
router.get("/me", async (req, res) => {
  try {
    const penggunaId = req.user.id;

    const pengguna = await prisma.pengguna.findUnique({
      where: { id: penggunaId },
      include: { profil: true },
    });

    if (!pengguna) return res.status(404).json({ message: "Pengguna tidak ditemukan" });

    return res.json({
      id: pengguna.id,
      email: pengguna.email,
      peran: pengguna.peran,
      profil: pengguna.profil, // bisa null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memuat profil" });
  }
});

/**
 * PUT /api/pengguna/me
 * body: { namaDepan, namaBelakang, nomorTelepon, jenisKelamin, newsletter }
 */
router.put("/me", async (req, res) => {
  try {
    const penggunaId = req.user.id;

    const {
      namaDepan = "",
      namaBelakang = "",
      nomorTelepon = "",
      jenisKelamin = null, // "LAKI_LAKI" | "PEREMPUAN"
      newsletter = false,
    } = req.body || {};

    if (!namaDepan || !nomorTelepon || !jenisKelamin) {
      return res.status(400).json({
        message: "Nama depan, nomor telepon, dan jenis kelamin wajib diisi",
      });
    }

    const profil = await prisma.profilPengguna.upsert({
      where: { penggunaId },
      create: {
        penggunaId,
        namaDepan: String(namaDepan),
        namaBelakang: String(namaBelakang || ""),
        nomorTelepon: String(nomorTelepon),
        jenisKelamin,
        newsletter: Boolean(newsletter),
      },
      update: {
        namaDepan: String(namaDepan),
        namaBelakang: String(namaBelakang || ""),
        nomorTelepon: String(nomorTelepon),
        jenisKelamin,
        newsletter: Boolean(newsletter),
      },
    });

    res.json({ message: "Profil berhasil disimpan", profil });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menyimpan profil" });
  }
});

/**
 * GET /api/pengguna/alamat
 */
router.get("/alamat", async (req, res) => {
  try {
    const penggunaId = req.user.id;

    const list = await prisma.alamatPengguna.findMany({
      where: { penggunaId },
      orderBy: [{ isUtama: "desc" }, { diubahPada: "desc" }],
    });

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memuat alamat" });
  }
});

/**
 * POST /api/pengguna/alamat
 */
router.post("/alamat", async (req, res) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menambah alamat" });
  }
});

/**
 * PATCH /api/pengguna/alamat/:id
 */
router.patch("/alamat/:id", async (req, res) => {
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

    const existing = await prisma.alamatPengguna.findFirst({
      where: { id, penggunaId },
    });
    if (!existing) return res.status(404).json({ message: "Alamat tidak ditemukan" });

    if (
      !label || !namaPenerima || !noTelp ||
      !provinsi || !kota || !kecamatan || !kelurahan || !kodePos || !alamat
    ) {
      return res.status(400).json({ message: "Field alamat belum lengkap" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (isUtama) {
        await tx.alamatPengguna.updateMany({
          where: { penggunaId, isUtama: true, NOT: { id } },
          data: { isUtama: false },
        });
      }

      return tx.alamatPengguna.update({
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
          latitude: latitude !== null ? Number(latitude) : null,
          longitude: longitude !== null ? Number(longitude) : null,
          mapsUrl: mapsUrl ? String(mapsUrl) : null,
        },
      });
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengubah alamat" });
  }
});

/**
 * DELETE /api/pengguna/alamat/:id
 */
router.delete("/alamat/:id", async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id = Number(req.params.id);

    if (!id) return res.status(400).json({ message: "ID alamat tidak valid" });

    const existing = await prisma.alamatPengguna.findFirst({
      where: { id, penggunaId },
    });
    if (!existing) return res.status(404).json({ message: "Alamat tidak ditemukan" });

    await prisma.alamatPengguna.delete({ where: { id } });

    res.json({ message: "Alamat berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menghapus alamat" });
  }
});

export default router;
