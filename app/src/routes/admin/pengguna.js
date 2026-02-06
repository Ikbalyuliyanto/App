import express from "express";
import prisma from "../../prisma.js";
import auth from "../../middleware/auth.js";
import adminOnly from "../../middleware/adminOnly.js";

const router = express.Router();

function buildNama(profil) {
  const depan = (profil?.namaDepan || "").trim();
  const belakang = (profil?.namaBelakang || "").trim();
  const nama = `${depan} ${belakang}`.trim();
  return nama || null;
}

// GET semua pengguna (ADMIN)
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const users = await prisma.pengguna.findMany({
      orderBy: { dibuatPada: "desc" },
      select: {
        id: true,
        email: true,
        peran: true,
        dibuatPada: true,
        diubahPada: true,
        profil: {
          select: {
            namaDepan: true,
            namaBelakang: true,
            nomorTelepon: true,
          },
        },
      },
    });

    // mapping supaya frontend gampang
    const mapped = users.map((u) => ({
      id: u.id,
      email: u.email,
      peran: u.peran,
      dibuatPada: u.dibuatPada,
      diubahPada: u.diubahPada,
      nama: buildNama(u.profil) || u.email,
      nomorTelepon: u.profil?.nomorTelepon || null,
    }));

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data pengguna" });
  }
});

// GET pengguna by ID (ADMIN)
router.get("/:id", auth, adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "ID tidak valid" });

  try {
    const user = await prisma.pengguna.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        peran: true,
        dibuatPada: true,
        diubahPada: true,
        profil: {
          select: {
            id: true,
            namaDepan: true,
            namaBelakang: true,
            nomorTelepon: true,
            jenisKelamin: true,
            newsletter: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ message: "Pengguna tidak ditemukan" });

    res.json({
      id: user.id,
      email: user.email,
      peran: user.peran,
      dibuatPada: user.dibuatPada,
      diubahPada: user.diubahPada,
      nama: buildNama(user.profil) || user.email,
      profil: user.profil || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data pengguna" });
  }
});

/**
 * POST /api/admin/pengguna
 * Body: { nama, email, password, peran }
 * - nama boleh "Nama Depan NamaBelakang"
 */
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { nama, email, password, peran } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "email dan password wajib diisi" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "password minimal 6 karakter" });
    }

    const role = String(peran || "USER").toUpperCase();
    if (!["USER", "ADMIN"].includes(role)) {
      return res.status(400).json({ message: "peran tidak valid" });
    }

    const fullName = String(nama || "").trim() || email;
    const parts = fullName.split(" ").filter(Boolean);
    const namaDepan = parts.shift() || fullName;
    const namaBelakang = parts.join(" ") || "-";

    const created = await prisma.pengguna.create({
      data: {
        email: String(email).toLowerCase().trim(),
        password: String(password), // NOTE: idealnya di-hash
        peran: role,
        profil: {
          create: {
            namaDepan,
            namaBelakang,
            nomorTelepon: "-",
            jenisKelamin: "LAKI_LAKI", // default (boleh ubah)
            newsletter: false,
          },
        },
      },
      select: {
        id: true,
        email: true,
        peran: true,
        dibuatPada: true,
        profil: { select: { namaDepan: true, namaBelakang: true } },
      },
    });

    res.json({
      message: "Pengguna berhasil dibuat",
      user: {
        id: created.id,
        email: created.email,
        peran: created.peran,
        dibuatPada: created.dibuatPada,
        nama: buildNama(created.profil) || created.email,
      },
    });
  } catch (err) {
    console.error(err);
    // prisma unique constraint email
    if (err?.code === "P2002") {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }
    res.status(500).json({ message: "Gagal membuat pengguna" });
  }
});

/**
 * PATCH /api/admin/pengguna/:id
 * Body: { nama?, email?, password?, peran? }
 */
router.patch("/:id", auth, adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "ID tidak valid" });

  try {
    const { nama, email, password, peran } = req.body || {};

    const dataUser = {};
    if (email) dataUser.email = String(email).toLowerCase().trim();
    if (peran) {
      const role = String(peran).toUpperCase();
      if (!["USER", "ADMIN"].includes(role)) {
        return res.status(400).json({ message: "peran tidak valid" });
      }
      dataUser.peran = role;
    }
    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ message: "password minimal 6 karakter" });
      }
      dataUser.password = String(password); // NOTE: idealnya di-hash
    }

    // split nama jadi depan/belakang
    let profilUpdate = null;
    if (nama) {
      const fullName = String(nama).trim();
      const parts = fullName.split(" ").filter(Boolean);
      const namaDepan = parts.shift() || fullName;
      const namaBelakang = parts.join(" ") || "-";
      profilUpdate = { namaDepan, namaBelakang };
    }

    // update user + profil dengan transaction
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.pengguna.update({
        where: { id },
        data: dataUser,
        select: { id: true, email: true, peran: true },
      });

      if (profilUpdate) {
        // pastikan profil ada
        const hasProfil = await tx.profilPengguna.findUnique({ where: { penggunaId: id } });
        if (hasProfil) {
          await tx.profilPengguna.update({
            where: { penggunaId: id },
            data: profilUpdate,
          });
        } else {
          await tx.profilPengguna.create({
            data: {
              penggunaId: id,
              ...profilUpdate,
              nomorTelepon: "-",
              jenisKelamin: "LAKI_LAKI",
              newsletter: false,
            },
          });
        }
      }

      const profil = await tx.profilPengguna.findUnique({
        where: { penggunaId: id },
        select: { namaDepan: true, namaBelakang: true },
      });

      return { ...u, profil };
    });

    res.json({
      message: "Pengguna berhasil diupdate",
      user: {
        id: updated.id,
        email: updated.email,
        peran: updated.peran,
        nama: buildNama(updated.profil) || updated.email,
      },
    });
  } catch (err) {
    console.error(err);
    if (err?.code === "P2002") {
      return res.status(400).json({ message: "Email sudah terpakai" });
    }
    res.status(500).json({ message: "Gagal update pengguna" });
  }
});

/**
 * DELETE /api/admin/pengguna/:id
 * Hapus user (delete relasi dulu biar aman dari FK)
 */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "ID tidak valid" });

  try {
    await prisma.$transaction(async (tx) => {
      // hapus relasi yang pasti punya FK ke pengguna
      await tx.alamatPengguna.deleteMany({ where: { penggunaId: id } });
      await tx.profilPengguna.deleteMany({ where: { penggunaId: id } });

      // keranjang + item
      const carts = await tx.keranjang.findMany({
        where: { penggunaId: id },
        select: { id: true },
      });
      const cartIds = carts.map(c => c.id);
      if (cartIds.length) {
        await tx.itemKeranjang.deleteMany({ where: { keranjangId: { in: cartIds } } });
        await tx.keranjang.deleteMany({ where: { id: { in: cartIds } } });
      }

      // pesanan: kalau mau benar2 delete, perlu delete itemPesanan/pengiriman/pembayaran dulu
      // biasanya admin tidak delete pesanan, jadi lebih aman BLOCK delete jika ada pesanan
      const hasOrder = await tx.pesanan.findFirst({ where: { penggunaId: id }, select: { id: true } });
      if (hasOrder) {
        throw new Error("USER_HAS_ORDER");
      }

      await tx.pengguna.delete({ where: { id } });
    });

    res.json({ message: "Pengguna berhasil dihapus" });
  } catch (err) {
    console.error(err);
    if (String(err.message) === "USER_HAS_ORDER") {
      return res.status(400).json({
        message: "Tidak bisa menghapus pengguna karena sudah memiliki pesanan. (Saran: nonaktifkan akun saja)",
      });
    }
    res.status(500).json({ message: "Gagal menghapus pengguna" });
  }
});

export default router;
