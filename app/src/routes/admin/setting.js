import path from 'path';
import fs from 'fs';
import express from 'express';
import multer from 'multer';

const router = express.Router();

// ==================== CONFIG MULTER ====================
const assetsDir = path.join(process.cwd(), 'public', 'assets','css'); // ROOT/public/assets
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, assetsDir);
  },
  filename: function (req, file, cb) {
    const type = req.body.type; // 'desktop' atau 'mobile'
    const fileName = type === 'desktop' ? 'desktop.webp' : 'mobile.webp';
    cb(null, fileName);
  }
});

const upload = multer({ storage });

// ==================== UPLOAD BANNER ====================
router.post("/banner", upload.single("banner"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "File tidak ada" });
  res.json({ message: "Banner berhasil disimpan!", file: req.file.filename });
});

// ==================== DELETE BANNER ====================
router.delete("/banner/:type", (req, res) => {
  const type = req.params.type; // 'desktop' atau 'mobile'
  const fileName = type === "mobile" ? "mobile.webp" : "desktop.webp";
  const filePath = path.join(assetsDir, fileName);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(err);
      return res.status(404).json({ message: "File tidak ditemukan" });
    }
    res.json({ message: "Banner berhasil dihapus" });
  });
});

export default router;
