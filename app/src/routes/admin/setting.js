import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "app", "public", "assets");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const type = req.body.type;
    if (type === "desktop") {
      cb(null, "baner.png");
    } else if (type === "mobile") {
      cb(null, "banermobile.png");
    } else {
      cb(new Error("Type tidak valid"));
    }
  }
});

const upload = multer({ storage });

// POST upload banner
router.post("/banner", upload.single("banner"), (req, res) => {
  res.json({ message: "Banner berhasil disimpan" });
});

// DELETE desktop
router.delete("/banner/desktop", (req, res) => {
  const filePath = path.join(uploadDir, "baner.png");
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ message: "Banner desktop dihapus" });
});

// DELETE mobile
router.delete("/banner/mobile", (req, res) => {
  const filePath = path.join(uploadDir, "banermobile.png");
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ message: "Banner mobile dihapus" });
});

export default router;
