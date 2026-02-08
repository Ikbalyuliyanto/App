import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../prisma.js";
import nodemailer from "nodemailer";

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

/* =========================
   CONFIG EMAIL (GRATIS)
========================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* =========================
   OTP STORE (IN MEMORY)
========================= */
const resetStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* =========================
   KIRIM EMAIL OTP
========================= */
async function sendResetEmail(email, code) {
  await transporter.sendMail({
    from: `"Ashanum Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Kode Reset Password Ashanum",
    html: `
      <h2>Reset Password</h2>
      <p>Kode verifikasi Anda:</p>
      <h1 style="letter-spacing:6px">${code}</h1>
      <p>Berlaku selama <b>10 menit</b></p>
      <p>Jika bukan Anda, abaikan email ini.</p>
    `
  });
}

/* =========================
   STEP 1 - MINTA OTP
========================= */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  const user = await prisma.pengguna.findUnique({
    where: { email }
  });

  // Jangan bocorkan apakah email ada atau tidak
  if (!user) {
    return res.json({
      message: "Jika email terdaftar, kode verifikasi telah dikirim"
    });
  }

  const code = generateOTP();

  resetStore.set(email, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 menit
  });

  await sendResetEmail(email, code);

  res.json({
    message: "Kode verifikasi telah dikirim ke email Anda"
  });
});

/* =========================
   STEP 2 - VERIFIKASI OTP
========================= */
router.post("/verify-code", (req, res) => {
  const { email, code } = req.body;

  const data = resetStore.get(email);

  if (!data || data.code !== code || Date.now() > data.expiresAt) {
    return res.status(400).json({
      message: "Kode verifikasi tidak valid atau kadaluarsa"
    });
  }

  res.json({ message: "Kode verifikasi valid" });
});

/* =========================
   STEP 3 - RESET PASSWORD
========================= */
router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;

  const data = resetStore.get(email);

  if (!data || data.code !== code || Date.now() > data.expiresAt) {
    return res.status(400).json({
      message: "Kode tidak valid atau kadaluarsa"
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.pengguna.update({
    where: { email },
    data: { password: hashedPassword }
  });

  resetStore.delete(email); // OTP sekali pakai

  res.json({
    message: "Password berhasil direset"
  });
});

export default router;
