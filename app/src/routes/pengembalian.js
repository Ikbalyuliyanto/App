import express         from "express";
import prisma           from "../prisma.js";
import auth             from "../middleware/auth.js";
import fs               from "fs";
import path             from "path";
import { fileURLToPath } from "url";
import sharp            from "sharp";
import { uploadMemory } from "../middleware/upload.js";

const router = express.Router();

// ─── Path helpers (sama persis dengan ulasan.js) ───────────────────
const __filename  = fileURLToPath(import.meta.url);
const __dirname   = path.dirname(__filename);
const rootDir     = path.join(__dirname, "..", "..", "..");
const uploadsRoot = path.join(rootDir, "uploads");

/**
 * Pad produkId menjadi 6 digit → "000001"
 * Dipakai sebagai nama folder produk, sama seperti ulasan
 */
function padProductId(id) {
  return String(id).padStart(6, "0");
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function removeDir(d) {
  if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
}

/**
 * Simpan buffer sebagai WebP dengan kompresi adaptif,
 * sama persis dengan fungsi saveWebp di ulasan.js
 */
async function saveWebp(buffer, outPath, maxKB = 150) {
  let quality = 80, output;
  do {
    output = await sharp(buffer)
      .rotate()
      .resize({ width: 1024, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    quality -= 5;
  } while (output.length > maxKB * 1024 && quality >= 30);
  await fs.promises.writeFile(outPath, output);
  return { sizeKB: Math.round(output.length / 1024), qualityUsed: quality + 5 };
}

// ──────────────────────────────────────────────────────────────────
/**
 * POST /api/pengembalian
 * Buyer ajukan pengembalian
 *
 * Struktur folder foto:
 *   /uploads/products/{000001}/pengembalian/{pengembalianId}/1.webp
 *   /uploads/products/{000001}/pengembalian/{pengembalianId}/2.webp
 *   ...
 *
 * Jika pesanan punya lebih dari 1 produk, foto disimpan di folder
 * produk pertama (produk dengan id terkecil) supaya tetap satu lokasi.
 *
 * Field foto dikirim sebagai multipart dengan fieldname "foto" (up to 5 file).
 */
router.post("/", auth, uploadMemory.array("foto", 5), async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const { pesananId, jenis, alasan, deskripsi } = req.body;

    if (!pesananId || !jenis || !alasan)
      return res.status(400).json({ message: "pesananId, jenis, alasan wajib diisi" });

    if (!["REFUND", "TUKAR"].includes(jenis))
      return res.status(400).json({ message: "Jenis harus REFUND atau TUKAR" });

    // Validasi pesanan milik user & status SELESAI
    const pesanan = await prisma.pesanan.findFirst({
      where  : { id: Number(pesananId), penggunaId },
      include: {
        pengembalian: true,
        item: {
          select: { produkId: true },
          orderBy: { produkId: "asc" }, // produk pertama = id terkecil
          take: 1,
        },
      },
    });

    if (!pesanan)
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });

    if (pesanan.status !== "SELESAI")
      return res.status(400).json({
        message: "Pengembalian hanya bisa diajukan untuk pesanan yang sudah selesai",
      });

    if (pesanan.pengembalian)
      return res.status(400).json({
        message: "Pengembalian sudah pernah diajukan untuk pesanan ini",
      });

    // Buat record dulu (tanpa foto) untuk mendapatkan ID
    const pengembalian = await prisma.pengembalian.create({
      data: {
        pesananId : Number(pesananId),
        penggunaId,
        jenis,
        alasan,
        deskripsi : deskripsi || null,
        foto      : [],   // diisi setelah upload
        status    : "DIAJUKAN",
      },
    });

    // ── Upload foto ke folder terstruktur ──────────────────────────
    const files     = req.files || [];
    const savedFoto = [];

    if (files.length > 0) {
      // Ambil produkId pertama dari item pesanan sebagai "anchor" folder
      const anchorProdukId = pesanan.item[0]?.produkId;

      if (anchorProdukId) {
        const folderId = padProductId(anchorProdukId);
        const fotoDir  = path.join(
          uploadsRoot,
          "products",
          folderId,
          "pengembalian",
          String(pengembalian.id)
        );
        ensureDir(fotoDir);

        for (let i = 0; i < Math.min(files.length, 5); i++) {
          const outPath    = path.join(fotoDir, `${i + 1}.webp`);
          const publicPath =
            `/uploads/products/${folderId}/pengembalian/${pengembalian.id}/${i + 1}.webp`;
          try {
            await saveWebp(files[i].buffer, outPath);
            savedFoto.push(publicPath);
          } catch (err) {
            console.error(
              `Gagal simpan foto pengembalian #${pengembalian.id} ke-${i + 1}:`,
              err
            );
          }
        }

        // Update kolom foto di DB setelah berhasil upload
        if (savedFoto.length > 0) {
          await prisma.pengembalian.update({
            where: { id: pengembalian.id },
            data : { foto: savedFoto },
          });
          pengembalian.foto = savedFoto;
        }
      }
    }

    res.status(201).json({
      message     : "Pengembalian berhasil diajukan",
      pengembalian: { ...pengembalian, foto: savedFoto },
    });
  } catch (e) {
    console.error("POST /api/pengembalian error:", e);
    res.status(500).json({ message: "Gagal mengajukan pengembalian" });
  }
});

// ──────────────────────────────────────────────────────────────────
/**
 * GET /api/pengembalian
 * Buyer lihat daftar pengembalian miliknya
 */
router.get("/", auth, async (req, res) => {
  try {
    const data = await prisma.pengembalian.findMany({
      where  : { penggunaId: req.user.id },
      orderBy: { dibuatPada: "desc" },
      include: { pesanan: { select: { id: true, totalAkhir: true } } },
    });
    res.json(data);
  } catch (e) {
    console.error("GET /api/pengembalian error:", e);
    res.status(500).json({ message: "Gagal mengambil data pengembalian" });
  }
});

// ──────────────────────────────────────────────────────────────────
/**
 * GET /api/pengembalian/:id
 * Detail pengembalian milik buyer
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const data = await prisma.pengembalian.findFirst({
      where  : { id: Number(req.params.id), penggunaId: req.user.id },
      include: { pesanan: true },
    });
    if (!data) return res.status(404).json({ message: "Tidak ditemukan" });
    res.json(data);
  } catch (e) {
    console.error("GET /api/pengembalian/:id error:", e);
    res.status(500).json({ message: "Gagal mengambil detail pengembalian" });
  }
});

// ──────────────────────────────────────────────────────────────────
/**
 * PATCH /api/pengembalian/:id/resi-kembali
 * Buyer input resi pengiriman barang kembali
 */
router.patch("/:id/resi-kembali", auth, async (req, res) => {
  try {
    const { resiKembali } = req.body;
    if (!resiKembali) return res.status(400).json({ message: "Resi wajib diisi" });

    const p = await prisma.pengembalian.findFirst({
      where: { id: Number(req.params.id), penggunaId: req.user.id },
    });

    if (!p) return res.status(404).json({ message: "Tidak ditemukan" });
    if (p.status !== "DISETUJUI")
      return res.status(400).json({ message: "Pengembalian belum disetujui admin" });

    const updated = await prisma.pengembalian.update({
      where: { id: p.id },
      data : { resiKembali, status: "BARANG_DIKIRIM_BALIK" },
    });

    res.json({ message: "Resi berhasil disimpan", pengembalian: updated });
  } catch (e) {
    console.error("PATCH resi-kembali error:", e);
    res.status(500).json({ message: "Gagal menyimpan resi" });
  }
});

// ──────────────────────────────────────────────────────────────────
/**
 * DELETE /api/pengembalian/:id
 * Buyer batalkan pengajuan (hanya jika masih DIAJUKAN)
 * Sekaligus hapus folder foto dari disk
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id         = Number(req.params.id);

    const p = await prisma.pengembalian.findFirst({
      where  : { id, penggunaId },
      include: {
        pesanan: {
          include: {
            item: { select: { produkId: true }, orderBy: { produkId: "asc" }, take: 1 },
          },
        },
      },
    });

    if (!p) return res.status(404).json({ message: "Tidak ditemukan" });
    if (p.status !== "DIAJUKAN")
      return res.status(400).json({ message: "Hanya pengajuan berstatus DIAJUKAN yang bisa dibatalkan" });

    await prisma.pengembalian.delete({ where: { id } });

    // Hapus folder foto dari disk
    const anchorProdukId = p.pesanan?.item[0]?.produkId;
    if (anchorProdukId) {
      const folderId = padProductId(anchorProdukId);
      removeDir(path.join(uploadsRoot, "products", folderId, "pengembalian", String(id)));
    }

    res.json({ message: "Pengajuan pengembalian berhasil dibatalkan" });
  } catch (e) {
    console.error("DELETE /api/pengembalian/:id error:", e);
    res.status(500).json({ message: "Gagal membatalkan pengembalian" });
  }
});

export default router;