// auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../prisma.js";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();

// ======================
// ENV & Konfigurasi
// ======================
const JWT_SECRET = process.env.JWT_SECRET || "rahasia";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// ======================
// Email config (Gmail App Password)
// ======================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ======================
// OTP STORE (IN MEMORY)
// ======================
const resetStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    `,
  });
}

// ======================
// REGISTER
// ======================
router.post("/register", async (req, res) => {
  try {
    const { firstname, lastname, email, phone, gender, password, newsletter } = req.body;
    if (!firstname || !lastname || !email || !phone || !gender || !password) {
      return res.status(400).json({ message: "Semua field wajib diisi" });
    }

    const existingUser = await prisma.pengguna.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "Email sudah terdaftar" });

    const hashedPassword = await bcrypt.hash(password, 10);

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
          },
        },
      },
    });

    await prisma.keranjang.create({ data: { penggunaId: pengguna.id } });

    res.status(201).json({ message: "Pendaftaran berhasil!", penggunaId: pengguna.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Register gagal" });
  }
});

// ======================
// LOGIN EMAIL/PASSWORD
// ======================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email dan password wajib diisi" });

    const pengguna = await prisma.pengguna.findUnique({ where: { email }, include: { profil: true } });
    if (!pengguna) return res.status(401).json({ message: "Email atau password salah" });

    const validPassword = await bcrypt.compare(password, pengguna.password);
    if (!validPassword) return res.status(401).json({ message: "Email atau password salah" });

    const token = jwt.sign(
      {
        id: pengguna.id,
        peran: pengguna.peran,
        namaDepan: pengguna.profil?.namaDepan,
        namaBelakang: pengguna.profil?.namaBelakang,
        email: pengguna.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, pengguna });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login gagal" });
  }
});

// ======================
// FORGOT PASSWORD (MINTA OTP)
// ======================
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await prisma.pengguna.findUnique({ where: { email } });

  // Jangan bocorkan info user
  if (!user) return res.json({ message: "Jika email terdaftar, kode verifikasi telah dikirim" });

  const code = generateOTP();
  resetStore.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  await sendResetEmail(email, code);

  res.json({ message: "Kode verifikasi telah dikirim ke email Anda" });
});

// ======================
// VERIFY OTP
// ======================
router.post("/verify-code", (req, res) => {
  const { email, code } = req.body;
  const data = resetStore.get(email);

  if (!data || data.code !== code || Date.now() > data.expiresAt) {
    return res.status(400).json({ message: "Kode verifikasi tidak valid atau kadaluarsa" });
  }

  res.json({ message: "Kode verifikasi valid" });
});

// ======================
// RESET PASSWORD
// ======================
router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  const data = resetStore.get(email);

  if (!data || data.code !== code || Date.now() > data.expiresAt) {
    return res.status(400).json({ message: "Kode tidak valid atau kadaluarsa" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.pengguna.update({ where: { email }, data: { password: hashedPassword } });
  resetStore.delete(email);

  res.json({ message: "Password berhasil direset" });
});

// ======================
// LOGIN GOOGLE
// ======================
router.post("/google-login", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token Google dibutuhkan" });

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const {
      email,
      given_name,
      family_name
    } = payload;

    // Cek user
    let user = await prisma.pengguna.findUnique({
      where: { email },
      include: { profil: true }
    });

    // Jika belum ada → buat baru
    if (!user) {

      // password random biar aman
      const randomPassword = await bcrypt.hash(
        Math.random().toString(36),
        10
      );

      user = await prisma.pengguna.create({
        data: {
          email,
          password: randomPassword,
          peran: "USER",
          profil: {
            create: {
              namaDepan: given_name || "User",
              namaBelakang: family_name || "",
              nomorTelepon: "-", // WAJIB karena prisma required
              jenisKelamin: "LAKI_LAKI", // WAJIB enum
              newsletter: false
            }
          }
        },
        include: { profil: true }
      });

      // Auto buat keranjang
      await prisma.keranjang.create({
        data: { penggunaId: user.id }
      });
    }

    // Buat JWT
    const tokenJWT = jwt.sign(
      {
        id: user.id,
        peran: user.peran,
        namaDepan: user.profil?.namaDepan,
        namaBelakang: user.profil?.namaBelakang,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token: tokenJWT, pengguna: user });

  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Token Google tidak valid" });
  }
});

export default router;