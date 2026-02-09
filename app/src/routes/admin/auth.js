import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../../prisma.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password wajib diisi" });
  }

  const pengguna = await prisma.pengguna.findUnique({ where: { email } });

  if (!pengguna) {
    return res.status(401).json({ message: "Email tidak ditemukan" });
  }
  
  const validPassword = await bcrypt.compare(password, pengguna.password);
  if (!validPassword) {
    return res.status(401).json({ message: "Password salah" });
  }

  const token = jwt.sign(
    { id: pengguna.id, peran: pengguna.peran, email: pengguna.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.json({
    token,
    pengguna: {
      id: pengguna.id,
      nama: pengguna.nama,
      email: pengguna.email,
      peran: pengguna.peran,
    },
  });
});

export default router;
