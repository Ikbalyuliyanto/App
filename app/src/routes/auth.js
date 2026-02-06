import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../prisma.js";

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      phone,
      gender,
      password,
      newsletter
    } = req.body;

    if (!firstname || !lastname || !email || !phone || !gender || !password) {
      return res.status(400).json({ message: "Semua field wajib diisi" });
    }

    // Cek email sudah terdaftar atau belum
    const existingUser = await prisma.pengguna.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user + profil
    const pengguna = await prisma.pengguna.create({
      data: {
        email,
        password: hashedPassword,
        peran: "USER",
        profil: {
          create: {
            namaDepan: firstname,
            namaBelakang: lastname,
            nomorTelepon: phone,
            jenisKelamin: gender === "male" ? "LAKI_LAKI" : "PEREMPUAN",
            newsletter: !!newsletter,
          }
        }
      }
    });

    // Buat keranjang otomatis
    await prisma.keranjang.create({ data: { penggunaId: pengguna.id } });

    return res.status(201).json({ message: "Pendaftaran berhasil!", penggunaId: pengguna.id });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Register gagal" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email dan password wajib diisi" });
    }

    const pengguna = await prisma.pengguna.findUnique({
      where: { email },
      include: { profil: true }
    });

    if (!pengguna) {
      return res.status(401).json({ message: "Email atau password salah" });
    }

    const validPassword = await bcrypt.compare(password, pengguna.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Email atau password salah" });
    }

    const token = jwt.sign(
      { id: pengguna.id, peran: pengguna.peran },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      pengguna: {
        id: pengguna.id,
        namaDepan: pengguna.profil?.namaDepan,
        namaBelakang: pengguna.profil?.namaBelakang,
        email: pengguna.email,
        peran: pengguna.peran
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Login gagal" });
  }
});

export default router;
