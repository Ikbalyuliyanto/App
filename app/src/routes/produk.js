import express from "express";
import prisma from "../prisma.js";

const router = express.Router();

// ── parseFoto helper ─────────────────────────
function parseFoto(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; }
  catch { return [raw]; }
}

// LIST PRODUK (publik)
router.get("/", async (req, res) => {
  try {
    const data = await prisma.produk.findMany({
      where  : { aktif: true },
      include: { kategori: true },
      orderBy: { id: "asc" },
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil produk", error: String(err) });
  }
});

// HOME SECTION: flashsale / terlaris / untukmu
router.get("/home/sections", async (req, res) => {
  try {
    const take = Math.min(Number(req.query.take || 10), 50);
    const [flashsale, terlaris, untukmu] = await Promise.all([
      prisma.produk.findMany({ where: { aktif: true, flashsale: true }, orderBy: { id: "desc" }, take, include: { kategori: true } }),
      prisma.produk.findMany({ where: { aktif: true, terlaris: true }, orderBy: { id: "desc" }, take, include: { kategori: true } }),
      prisma.produk.findMany({ where: { aktif: true, untukmu: true  }, orderBy: { id: "desc" }, take, include: { kategori: true } }),
    ]);
    res.json({ flashsale, terlaris, untukmu });
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil home sections", error: String(err) });
  }
});

// DETAIL PRODUK
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID tidak valid" });

    // Ambil data produk + hitung rating langsung dari tabel Ulasan
    const [data, agg] = await Promise.all([
      prisma.produk.findUnique({
        where  : { id },
        include: {
          kategori    : true,
          galeri      : { orderBy: { urutan: "asc" } },
          atributProduk: {
            orderBy: { urutan: "asc" },
            include: { nilai: { orderBy: { urutan: "asc" } } },
          },
          varianProduk: {
            include: { atribut: { include: { nilai: true } } },
          },
        },
      }),
      prisma.ulasan.aggregate({
        where : { produkId: id },
        _avg  : { rating: true },
        _count: { rating: true },
      }),
    ]);

    if (!data || data.aktif !== true)
      return res.status(404).json({ message: "Produk tidak ditemukan atau tidak aktif" });

    // Override ratingRata & jumlahRating dengan data live dari tabel Ulasan
    res.json({
      ...data,
      ratingRata  : Number((agg._avg.rating || 0).toFixed(1)),
      jumlahRating: agg._count.rating,
    });
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil detail produk", error: String(err) });
  }
});

// PRODUK TERKAIT
router.get("/:id/related", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });

    const currentProduct = await prisma.produk.findUnique({
      where : { id },
      select: { kategoriId: true },
    });
    if (!currentProduct) return res.status(404).json({ message: "Produk tidak ditemukan" });

    const relatedProducts = await prisma.produk.findMany({
      where  : { kategoriId: currentProduct.kategoriId, id: { not: id }, aktif: true },
      include: { kategori: true },
      take   : 10,
      orderBy: [{ terlaris: "desc" }, { terjual: "desc" }, { dibuatPada: "desc" }],
    });

    res.json(relatedProducts);
  } catch (e) {
    console.error("GET /api/produk/:id/related ERROR:", e);
    res.status(500).json({ message: e.message || "Gagal ambil produk terkait" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  GET /api/produk/:id/ulasan  — ulasan per produk (PUBLIK)
//  Letakkan di sini agar tidak perlu auth, dan pakai prefix /produk
// ─────────────────────────────────────────────────────────────────
router.get("/:id/ulasan", async (req, res) => {
  try {
    const produkId = Number(req.params.id);
    if (!produkId) return res.status(400).json({ message: "ID produk tidak valid" });

    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip  = (page - 1) * limit;

    const [total, ulasanRows, agg, distribusi] = await Promise.all([
      prisma.ulasan.count({ where: { produkId } }),

      prisma.ulasan.findMany({
        where  : { produkId },
        orderBy: { dibuatPada: "desc" },
        skip, take: limit,
        select : {
          id        : true,
          penggunaId: true,
          nama      : true,
          email     : true,   // dikirim ke frontend, disensor di sana
          rating    : true,
          komentar  : true,
          foto      : true,
          dibuatPada: true,
        },
      }),

      prisma.ulasan.aggregate({
        where : { produkId },
        _avg  : { rating: true },
        _count: { rating: true },
      }),

      // distribusi per bintang untuk bar chart
      prisma.ulasan.groupBy({
        by   : ["rating"],
        where: { produkId },
        _count: { rating: true },
      }),
    ]);

    // { 1: n, 2: n, 3: n, 4: n, 5: n }
    const perBintang = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of distribusi) perBintang[d.rating] = d._count.rating;

    const ulasan = ulasanRows.map((u) => ({
      id        : u.id,
      rating    : u.rating,
      komentar  : u.komentar,
      foto      : parseFoto(u.foto),
      dibuatPada: u.dibuatPada,
      pengguna  : {
        id   : u.penggunaId,
        email: u.email || null,  // frontend sensor: ab***@gmail.com
        nama : u.nama  || null,  // fallback jika tidak ada email
      },
    }));

    return res.json({
      total, page, limit,
      totalPage   : Math.ceil(total / limit),
      rataRating  : Number((agg._avg.rating || 0).toFixed(1)),
      jumlahUlasan: agg._count.rating,
      perBintang,
      ulasan,
    });
  } catch (e) {
    console.error("GET /api/produk/:id/ulasan error:", e);
    res.status(500).json({ message: "Gagal mengambil ulasan produk" });
  }
});

export default router;