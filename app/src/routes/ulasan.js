import express from "express";
import prisma from "../prisma.js";
import fs    from "fs";
import path  from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { uploadMemory } from "../middleware/upload.js";

const router = express.Router();

// ─── Path helpers ─────────────────────────────────────────────────
const __filename  = fileURLToPath(import.meta.url);
const __dirname   = path.dirname(__filename);
const rootDir     = path.join(__dirname, "..", "..", "..");
const uploadsRoot = path.join(rootDir, "uploads");

function padProductId(id) {
  return String(id).padStart(6, "0");
}
function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}
function removeDir(d) {
  if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
}
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
function parseFoto(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; }
  catch { return [raw]; }
}

// ─────────────────────────────────────────────────────────────────
//  POST /api/ulasan/:pesananId  — buat ulasan baru
// ─────────────────────────────────────────────────────────────────
router.post("/:pesananId", uploadMemory.any(), async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const pesananId  = Number(req.params.pesananId);

    let ulasan;
    try { ulasan = JSON.parse(req.body.ulasan || "[]"); }
    catch { return res.status(400).json({ message: "Field 'ulasan' harus berupa JSON string yang valid" }); }

    if (!pesananId)
      return res.status(400).json({ message: "ID pesanan tidak valid" });
    if (!Array.isArray(ulasan) || ulasan.length === 0)
      return res.status(400).json({ message: "Data ulasan tidak boleh kosong" });

    // Fetch pesanan — tanpa include relasi Ulasan
    const pesanan = await prisma.pesanan.findFirst({
      where  : { id: pesananId, penggunaId },
      include: { item: { include: { produk: true } } },
    });

    if (!pesanan)
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    if (pesanan.status !== "SELESAI")
      return res.status(400).json({ message: "Ulasan hanya bisa diberikan untuk pesanan yang sudah selesai" });

    // Map: itemId → produkId
    const itemMap = new Map();
    for (const it of pesanan.item) itemMap.set(it.id, it.produkId);

    // Validasi itemId & rating
    for (const u of ulasan) {
      if (!itemMap.has(Number(u.itemId)))
        return res.status(400).json({ message: `Item ID ${u.itemId} tidak ditemukan dalam pesanan ini` });
      const r = Number(u.rating);
      if (!Number.isInteger(r) || r < 1 || r > 5)
        return res.status(400).json({ message: `Rating harus 1-5 (item ${u.itemId})` });
    }

    // Cek apakah sudah pernah ulasan (manual — tanpa relasi)
    const produkIds = ulasan.map((u) => itemMap.get(Number(u.itemId)));
    const existing  = await prisma.ulasan.findMany({
      where : { penggunaId, produkId: { in: produkIds } },
      select: { produkId: true },
    });

    if (existing.length > 0) {
      const sudahIds   = existing.map((e) => e.produkId);
      const namaProduk = pesanan.item
        .filter((it) => sudahIds.includes(it.produkId))
        .map((it) => it.produk?.nama || `Produk #${it.produkId}`)
        .join(", ");
      return res.status(409).json({ message: `Anda sudah memberikan ulasan untuk: ${namaProduk}` });
    }

    // ── Ambil email & nama user untuk disimpan di kolom Ulasan ──
    const [pengguna, profil] = await Promise.all([
      prisma.pengguna.findUnique({
        where : { id: penggunaId },
        select: { email: true },
      }),
      prisma.profilPengguna.findUnique({
        where : { penggunaId },
        select: { namaDepan: true, namaBelakang: true },
      }),
    ]);
    const emailUser = pengguna?.email ?? null;
    const namaUser  = profil
      ? `${profil.namaDepan} ${profil.namaBelakang}`.trim()
      : null;

    // Kumpulkan file foto per itemId
    const filesByItem = new Map();
    for (const file of (req.files || [])) {
      const match = file.fieldname.match(/^foto_(\d+)_\d+$/);
      if (!match) continue;
      const key = match[1];
      if (!filesByItem.has(key)) filesByItem.set(key, []);
      filesByItem.get(key).push(file);
    }

    // Simpan ulasan ke DB — hanya field plain, tidak ada connect relasi
    const created = await prisma.$transaction(
      ulasan.map((u) => prisma.ulasan.create({
        data: {
          penggunaId,                                // plain Int
          produkId  : itemMap.get(Number(u.itemId)), // plain Int
          pesananId,                                 // plain Int
          email     : emailUser,                     // ← disimpan sekarang
          nama      : namaUser,                      // ← disimpan sekarang
          rating    : Number(u.rating),
          komentar  : u.komentar?.trim() || null,
          foto      : null,
        },
      }))
    );

    // Upload foto & update kolom foto
    const uploadResults = [];
    for (const record of created) {
      const entry = ulasan.find((u) => itemMap.get(Number(u.itemId)) === record.produkId);
      if (!entry) continue;

      const folderId = padProductId(record.produkId);
      const files    = filesByItem.get(String(entry.itemId)) || [];
      if (!files.length) { uploadResults.push({ ulasanId: record.id, fotos: [] }); continue; }

      const fotoDir = path.join(uploadsRoot, "products", folderId, "ulasan", String(record.id));
      ensureDir(fotoDir);

      const savedPaths = [];
      for (let i = 0; i < Math.min(files.length, 5); i++) {
        const outPath    = path.join(fotoDir, `${i + 1}.webp`);
        const publicPath = `/uploads/products/${folderId}/ulasan/${record.id}/${i + 1}.webp`;
        try {
          await saveWebp(files[i].buffer, outPath);
          savedPaths.push(publicPath);
        } catch (err) {
          console.error(`Gagal simpan foto ulasan #${record.id} ke-${i + 1}:`, err);
        }
      }

      if (savedPaths.length > 0) {
        await prisma.ulasan.update({
          where: { id: record.id },
          data : { foto: JSON.stringify(savedPaths) },
        });
        record.foto = JSON.stringify(savedPaths);
      }
      uploadResults.push({ ulasanId: record.id, fotos: savedPaths });
    }

    return res.status(201).json({
      message      : "Ulasan berhasil disimpan",
      total        : created.length,
      ulasan       : created.map((u) => ({ ...u, foto: parseFoto(u.foto) })),
      uploadResults,
    });

  } catch (e) {
    if (e.code === "P2002")
      return res.status(409).json({ message: "Anda sudah memberikan ulasan untuk salah satu produk ini" });
    console.error("POST /api/ulasan/:pesananId error:", e);
    res.status(500).json({ message: "Gagal menyimpan ulasan" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  GET /api/ulasan/saya  — ulasan milik user yang login
//  Manual join: ambil produk & pesanan berdasarkan ID tersimpan
// ─────────────────────────────────────────────────────────────────
router.get("/saya", async (req, res) => {
  try {
    // 1. Ambil semua ulasan milik user — hanya kolom plain
    const ulasanRows = await prisma.ulasan.findMany({
      where  : { penggunaId: req.user.id },
      orderBy: { dibuatPada: "desc" },
      select : {
        id        : true,
        produkId  : true,   // plain Int
        pesananId : true,   // plain Int
        rating    : true,
        komentar  : true,
        foto      : true,
        dibuatPada: true,
      },
    });

    if (ulasanRows.length === 0) return res.json([]);

    // 2. Kumpulkan ID unik
    const produkIds  = [...new Set(ulasanRows.map((u) => u.produkId).filter(Boolean))];
    const pesananIds = [...new Set(ulasanRows.map((u) => u.pesananId).filter(Boolean))];

    // 3. Fetch produk & pesanan secara paralel (manual join)
    const [produkList, pesananList] = await Promise.all([
      produkIds.length > 0
        ? prisma.produk.findMany({
            where : { id: { in: produkIds } },
            select: { id: true, nama: true, gambarUtama: true },
          })
        : [],
      pesananIds.length > 0
        ? prisma.pesanan.findMany({
            where : { id: { in: pesananIds } },
            select: { id: true },
          })
        : [],
    ]);

    // 4. Buat lookup map
    const produkMap  = new Map(produkList.map((p) => [p.id, p]));
    const pesananMap = new Map(pesananList.map((p) => [p.id, p]));

    // 5. Gabungkan manual
    const result = ulasanRows.map((u) => ({
      id        : u.id,
      rating    : u.rating,
      komentar  : u.komentar,
      foto      : parseFoto(u.foto),
      dibuatPada: u.dibuatPada,
      produk    : produkMap.get(u.produkId)  ?? { id: u.produkId,  nama: null, gambarUtama: null },
      pesanan   : pesananMap.get(u.pesananId) ?? { id: u.pesananId },
    }));

    return res.json(result);
  } catch (e) {
    console.error("GET /api/ulasan/saya error:", e);
    res.status(500).json({ message: "Gagal mengambil ulasan Anda" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  DELETE /api/ulasan/:id
// ─────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const penggunaId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID ulasan tidak valid" });

    const ulasan = await prisma.ulasan.findFirst({
      where : { id, penggunaId },
      select: { id: true, produkId: true },
    });
    if (!ulasan) return res.status(404).json({ message: "Ulasan tidak ditemukan" });

    await prisma.ulasan.delete({ where: { id } });

    // Hapus folder foto ulasan
    const folderId = padProductId(ulasan.produkId);
    removeDir(path.join(uploadsRoot, "products", folderId, "ulasan", String(id)));

    return res.json({ message: "Ulasan berhasil dihapus" });
  } catch (e) {
    console.error("DELETE /api/ulasan/:id error:", e);
    res.status(500).json({ message: "Gagal menghapus ulasan" });
  }
});

export default router;