import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config(); // baca .env


// FRONT 
import home from "./routes/home.js";
import authRoutes from "./routes/auth.js";
import produk from "./routes/produk.js";
import kategori from "./routes/kategori.js";
import keranjang from "./routes/keranjang.js";
import pesanan from "./routes/pesanan.js";
import pembayaran from "./routes/pembayaran.js";
import checkoutRoutes from "./routes/checkout.js";
import pengguna from "./routes/pengguna.js";
import wilayahRouter from "./routes/wilayah.js";
import ulasan from "./routes/ulasan.js";

// FRONT END

// ADMIN ROUTES
import authAdmin from "./routes/admin/auth.js";
import adminProduk from "./routes/admin/produk.js";
import adminPesanan from "./routes/admin/pesanan.js";
import adminPengguna from "./routes/admin/pengguna.js";
import adminKategori from "./routes/admin/kategori.js";
import adminPembayaran from "./routes/admin/pembayaran.js";
import adminSetting from "./routes/admin/setting.js";
import laporanRouter from "./routes/admin/laporan.js";
// ADMIN END

import authJWT from "./middleware/auth.js";
import adminOnly from "./middleware/adminOnly.js";

const app = express();

// ===== Path helpers (HANYA SEKALI)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Jika file ini ada di: zawawiya/app/src/index.js
// rootDir = zawawiya/
const rootDir = path.join(__dirname, "..", "..");

const devUploads = path.join(rootDir, "uploads");      // lokal/dev
const prodUploads = path.join(process.cwd(), "uploads"); // Docker/prod
// ===== Middleware dasar
app.use(cors());
app.use(express.json());

// app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.static(path.join(__dirname, "..", "public")));
const uploadsPath = process.env.UPLOAD_ENV === "lokal" ? devUploads : prodUploads;
app.use("/uploads", express.static(uploadsPath));
console.log("Menggunakan folder uploads:", uploadsPath);



// ===== Route Auth (login/register)
app.use("/api/auth", authRoutes);
// ===== Route Auth (Admin)
app.use("/api/admin/auth", authAdmin);


// ===== Public API (boleh tanpa login)
app.use("/api/home", home);  
app.use("/api/produk", produk);
app.use("/api/kategori", kategori);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/wilayah", wilayahRouter);



// ===== User API (WAJIB login)
app.use("/api/keranjang", authJWT, keranjang);
app.use("/api/pesanan", authJWT, pesanan);
app.use("/api/pembayaran", authJWT, pembayaran);
app.use("/api/pengguna", authJWT, pengguna);
app.use("/api/ulasan", authJWT, ulasan);



// ===== Admin API (WAJIB login + ADMIN)
app.use("/api/admin/produk", authJWT, adminOnly, adminProduk);
app.use("/api/admin/pesanan", authJWT, adminOnly, adminPesanan);
app.use("/api/admin/pengguna", authJWT, adminOnly, adminPengguna);
app.use("/api/admin/kategori", authJWT, adminOnly, adminKategori);
app.use("/api/admin/pembayaran", authJWT, adminOnly, adminPembayaran);
app.use("/api/admin/setting", authJWT, adminOnly, adminSetting);
app.use("/api/admin/laporan",    authJWT, adminOnly, laporanRouter); 



app.get("/", (req, res) => res.json({ message: "API Bryna jalan 🚀" }));

const PORT = Number(process.env.PORT || 9876); // misal default 9876

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server jalan di http://0.0.0.0:${PORT}`)
);
