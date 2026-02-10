import express from "express";
import prisma from "../prisma.js";

const router = express.Router();

// LIST PRODUK (untuk publik biasanya filter aktif)
router.get("/", async (req, res) => {
  try {
    const data = await prisma.produk.findMany({
      where: { aktif: true }, // <- kalau endpoint publik, ini wajib biar yang nonaktif gak kebaca
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
      prisma.produk.findMany({
        where: { aktif: true, flashsale: true },
        orderBy: { id: "desc" },
        take,
        include: { kategori: true }
      }),
      prisma.produk.findMany({
        where: { aktif: true, terlaris: true },
        orderBy: { id: "desc" },
        take,
        include: { kategori: true }
      }),
      prisma.produk.findMany({
        where: { aktif: true, untukmu: true },
        orderBy: { id: "desc" },
        take,
        include: { kategori: true }
      }),
    ]);

    res.json({ flashsale, terlaris, untukmu });
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil home sections", error: String(err) });
  }
});

// DETAIL PRODUK (hanya produk aktif)
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID tidak valid" });
    }

    const data = await prisma.produk.findUnique({
      where: { id },
      include: {
        kategori: true,
        galeri: { orderBy: { urutan: "asc" } },
        atributProduk: {
          orderBy: { urutan: "asc" },
          include: { nilai: { orderBy: { urutan: "asc" } } },
        },
        varianProduk: {
          include: {
            atribut: { include: { nilai: true } },
          },
        },
      },
    });

    if (!data || data.aktif !== true) {
      return res.status(404).json({ message: "Produk tidak ditemukan atau tidak aktif" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil detail produk", error: String(err) });
  }
});


// ============================================
// TAMBAHKAN KODE INI KE FILE: routes/admin/produk.js
// Letakkan SETELAH endpoint GET /:id (detail produk)
// ============================================

// ✅ GET PRODUK TERKAIT (berdasarkan kategori yang sama)
// ============================================
// COPY KODE INI KE FILE: routes/admin/produk.js
// ATAU ke: routes/produk.js (tergantung struktur Anda)
// 
// LETAKKAN SETELAH ENDPOINT: router.get("/:id", ...)
// TAPI SEBELUM ENDPOINT LAIN YANG PAKAI PARAMETER
// ============================================

// ✅ GET PRODUK TERKAIT (berdasarkan kategori yang sama)
router.get("/:id/related", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID tidak valid" });
    }

    // Ambil produk untuk cek kategorinya
    const currentProduct = await prisma.produk.findUnique({
      where: { id },
      select: { kategoriId: true },
    });

    if (!currentProduct) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    // Ambil 10 produk dengan kategori yang sama (exclude produk ini sendiri)
    const relatedProducts = await prisma.produk.findMany({
      where: {
        kategoriId: currentProduct.kategoriId,
        id: { not: id }, // exclude produk yang sedang dilihat
        aktif: true,      // hanya yang aktif
      },
      include: {
        kategori: true,
      },
      take: 10,
      orderBy: [
        { terlaris: 'desc' },  // prioritaskan terlaris
        { terjual: 'desc' },   // kemudian yang paling laku
        { dibuatPada: 'desc' }  // terakhir yang terbaru
      ],
    });

    res.json(relatedProducts);
  } catch (e) {
    console.error("GET /api/produk/:id/related ERROR:", e);
    res.status(500).json({ message: e.message || "Gagal ambil produk terkait" });
  }
});

// ============================================
// PENTING: 
// 1. Pastikan endpoint ini SETELAH GET /:id
// 2. Pastikan endpoint ini SEBELUM POST, PUT, DELETE
// 3. Restart server setelah menambahkan!
// ============================================
export default router;