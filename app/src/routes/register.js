// import express from "express";
// import bcrypt from "bcrypt";
// import prisma from "../prisma/client.js";

// const router = express.Router();

// router.post("/register", async (req, res) => {
//   try {
//     const {
//       firstname,
//       lastname,
//       email,
//       phone,
//       gender,
//       password,
//       newsletter
//     } = req.body;

//     // 1️⃣ Validasi dasar
//     if (!firstname || !lastname || !email || !password || !gender || !phone) {
//       return res.status(400).json({ message: "Semua field wajib diisi" });
//     }

//     // 2️⃣ Cek email unik
//     const existingUser = await prisma.pengguna.findUnique({ where: { email } });
//     if (existingUser) {
//       return res.status(400).json({ message: "Email sudah terdaftar" });
//     }

//     // 3️⃣ Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // 4️⃣ Buat user + profil
//     const pengguna = await prisma.pengguna.create({
//       data: {
//         email,
//         password: hashedPassword,
//         peran: "USER", // 🔒 wajib USER
//         profil: {
//           create: {
//             namaDepan: firstname,
//             namaBelakang: lastname,
//             nomorTelepon: phone,
//             jenisKelamin: gender === "male" ? "LAKI_LAKI" : "PEREMPUAN",
//             newsletter: !!newsletter
//           }
//         }
//       }
//     });

//     // 5️⃣ Buat keranjang otomatis
//     await prisma.keranjang.create({ data: { penggunaId: pengguna.id } });

//     res.status(201).json({ message: "Pendaftaran berhasil!", penggunaId: pengguna.id });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Register gagal" });
//   }
// });

// router.post("/forgot-password", async (req, res) => {
//   const { email } = req.body;

//   const user = await prisma.pengguna.findUnique({ where: { email } });

//   // Jangan bocorkan email terdaftar atau tidak
//   if (!user) {
//     return res.json({
//       message: "Jika email terdaftar, link reset telah dikirim"
//     });
//   }

//   const token = crypto.randomBytes(32).toString("hex");

//   await prisma.pengguna.update({
//     where: { id: user.id },
//     data: {
//       resetPasswordToken: token,
//       resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000) // 1 jam
//     }
//   });

//   const link = `${process.env.BASE_URL}/reset-password.html?token=${token}`;

//   await sendResetEmail(email, link);

//   res.json({
//     message: "Jika email terdaftar, link reset telah dikirim"
//   });
// });

// router.post("/reset-password", async (req, res) => {
//   const { token, password } = req.body;

//   const user = await prisma.pengguna.findFirst({
//     where: {
//       resetPasswordToken: token,
//       resetPasswordExpiry: { gt: new Date() }
//     }
//   });

//   if (!user) {
//     return res.status(400).json({
//       message: "Token tidak valid atau kadaluarsa"
//     });
//   }

//   const hashed = await bcrypt.hash(password, 10);

//   await prisma.pengguna.update({
//     where: { id: user.id },
//     data: {
//       password: hashed,
//       resetPasswordToken: null,
//       resetPasswordExpiry: null
//     }
//   });

//   res.json({ message: "Password berhasil diubah" });
// });

// export default router;
