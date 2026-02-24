import express          from "express";
import prisma            from "../../prisma.js";
import auth              from "../../middleware/auth.js";
import fs                from "fs";
import path              from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// ─── Path helpers (sama dengan ulasan.js & pengembalian user) ──────
const __filename  = fileURLToPath(import.meta.url);
const __dirname   = path.dirname(__filename);
// routes/admin/pengembalian.js → src → app → root
const rootDir     = path.join(__dirname, "..", "..", "..", "..");
const uploadsRoot = path.join(rootDir, "uploads");

function padProductId(id) {
  return String(id).padStart(6, "0");
}
function removeDir(d) {
  if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
}

function onlyAdmin(req, res, next) {
  if (!req.user || String(req.user.peran) !== "ADMIN")
    return res.status(403).json({ message: "Akses admin ditolak" });
  next();
}

// ──────────────────────────────────────────────────────────────────
// GET /api/admin/pengembalian
// Query: q, status, jenis, from, to
// ──────────────────────────────────────────────────────────────────
router.get("/", auth, onlyAdmin, async (req, res) => {
  try {
    const q      = String(req.query.q      || "").trim();
    const status = String(req.query.status || "").trim();
    const jenis  = String(req.query.jenis  || "").trim();
    const from   = req.query.from ? new Date(req.query.from) : null;
    const to     = req.query.to   ? new Date(req.query.to)   : null;

    if (from) from.setHours(0,  0,  0,   0);
    if (to)   to  .setHours(23, 59, 59, 999);

    const where = {};
    if (status) where.status = status;
    if (jenis)  where.jenis  = jenis;
    if (from || to) {
      where.dibuatPada = {};
      if (from) where.dibuatPada.gte = from;
      if (to)   where.dibuatPada.lte = to;
    }

    // filter ID numerik
    if (q) {
      const idNum = Number(q);
      if (!Number.isNaN(idNum))
        where.OR = [{ id: idNum }, { pesananId: idNum }];
    }

    const data = await prisma.pengembalian.findMany({
      where,
      orderBy: { dibuatPada: "desc" },
      include: {
        pengguna: {
          select: {
            id    : true,
            email : true,
            profil: { select: { namaDepan: true, namaBelakang: true } },
          },
        },
        pesanan: {
          select: {
            id        : true,
            status    : true,
            totalAkhir: true,
            item: {
              select: {
                id     : true,
                jumlah : true,
                harga  : true,
                produk : { select: { nama: true, gambarUtama: true } },
              },
            },
          },
        },
      },
    });

    // flatten nama + filter email/nama jika q bukan angka
    const ql = q && Number.isNaN(Number(q)) ? q.toLowerCase() : null;

    const mapped = data
      .map((r) => {
        const p    = r.pengguna?.profil;
        const nama = p
          ? `${p.namaDepan || ""} ${p.namaBelakang || ""}`.trim()
          : r.pengguna?.email || "User";

        if (ql) {
          const emailMatch = (r.pengguna?.email || "").toLowerCase().includes(ql);
          const namaMatch  = nama.toLowerCase().includes(ql);
          if (!emailMatch && !namaMatch) return null;
        }

        return {
          ...r,
          pengguna: { id: r.pengguna?.id, email: r.pengguna?.email, nama },
        };
      })
      .filter(Boolean);

    res.json(mapped);
  } catch (e) {
    console.error("GET /api/admin/pengembalian error:", e);
    res.status(500).json({ message: "Gagal memuat data pengembalian" });
  }
});

// ──────────────────────────────────────────────────────────────────
// GET /api/admin/pengembalian/:id — detail lengkap
// ──────────────────────────────────────────────────────────────────
router.get("/:id", auth, onlyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID tidak valid" });

    const data = await prisma.pengembalian.findUnique({
      where  : { id },
      include: {
        pengguna: { include: { profil: true } },
        pesanan : {
          include: {
            item: { include: { produk: true, varian: true } },
            pembayaran: true,
          },
        },
      },
    });

    if (!data) return res.status(404).json({ message: "Pengembalian tidak ditemukan" });
    res.json(data);
  } catch (e) {
    console.error("GET /api/admin/pengembalian/:id error:", e);
    res.status(500).json({ message: "Gagal memuat detail pengembalian" });
  }
});

// ──────────────────────────────────────────────────────────────────
// PATCH /api/admin/pengembalian/:id
// Body: { status?, catatanAdmin? }
//
// Validasi transisi status:
//   DIAJUKAN            → DISETUJUI | DITOLAK
//   DISETUJUI           → BARANG_DIKIRIM_BALIK | SELESAI
//   BARANG_DIKIRIM_BALIK→ SELESAI
//   DITOLAK / SELESAI   → (tidak bisa diubah lagi)
// ──────────────────────────────────────────────────────────────────
router.patch("/:id", auth, onlyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID tidak valid" });

    const { status, catatanAdmin } = req.body || {};

    if (!status && catatanAdmin === undefined)
      return res.status(400).json({ message: "Tidak ada data yang diperbarui" });

    const validStatus = ["DIAJUKAN","DISETUJUI","DITOLAK","BARANG_DIKIRIM_BALIK","SELESAI"];
    if (status && !validStatus.includes(status))
      return res.status(400).json({ message: "Status tidak valid" });

    const existing = await prisma.pengembalian.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Pengembalian tidak ditemukan" });

    // Validasi transisi
    if (status) {
      const transisi = {
        DIAJUKAN            : ["DISETUJUI", "DITOLAK"],
        DISETUJUI           : ["BARANG_DIKIRIM_BALIK", "SELESAI"],
        BARANG_DIKIRIM_BALIK: ["SELESAI"],
        DITOLAK             : [],
        SELESAI             : [],
      };
      const allowed = transisi[existing.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Tidak bisa mengubah status dari ${existing.status} ke ${status}`,
        });
      }
    }

    // Catatan admin wajib diisi saat menolak
    if (status === "DITOLAK" && !catatanAdmin && !existing.catatanAdmin)
      return res.status(400).json({ message: "Alasan penolakan wajib diisi di catatan admin" });

    const updateData = {};
    if (status)                     updateData.status       = status;
    if (catatanAdmin !== undefined)  updateData.catatanAdmin = String(catatanAdmin);

    const updated = await prisma.pengembalian.update({
      where: { id },
      data : updateData,
    });

    res.json({ message: "Pengembalian berhasil diperbarui", pengembalian: updated });
  } catch (e) {
    console.error("PATCH /api/admin/pengembalian/:id error:", e);
    res.status(500).json({ message: "Gagal memperbarui pengembalian" });
  }
});

// ──────────────────────────────────────────────────────────────────
// DELETE /api/admin/pengembalian/:id
// Admin hapus record + folder foto dari disk
// ──────────────────────────────────────────────────────────────────
router.delete("/:id", auth, onlyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID tidak valid" });

    const existing = await prisma.pengembalian.findUnique({
      where  : { id },
      include: {
        pesanan: {
          include: {
            item: { select: { produkId: true }, orderBy: { produkId: "asc" }, take: 1 },
          },
        },
      },
    });
    if (!existing) return res.status(404).json({ message: "Pengembalian tidak ditemukan" });

    await prisma.pengembalian.delete({ where: { id } });

    // Hapus folder foto terstruktur dari disk
    const anchorProdukId = existing.pesanan?.item[0]?.produkId;
    if (anchorProdukId) {
      const folderId = padProductId(anchorProdukId);
      removeDir(path.join(uploadsRoot, "products", folderId, "pengembalian", String(id)));
    }

    res.json({ message: "Pengembalian berhasil dihapus" });
  } catch (e) {
    console.error("DELETE /api/admin/pengembalian/:id error:", e);
    res.status(500).json({ message: "Gagal menghapus pengembalian" });
  }
});

export default router;