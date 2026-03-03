// =============================================
// routes/admin/data.js
// Generic CRUD router untuk semua model Prisma
// Mount di: app.use("/api/admin/data", adminDataRouter)
// =============================================

import express from "express";
import prisma from "../../prisma.js";

const router = express.Router();

// ── Config tiap model: field yg boleh di-select, orderBy default, searchable fields
const MODEL_CONFIG = {
  pengguna: {
    select: { id: true, email: true, peran: true, dibuatPada: true, diubahPada: true },
    orderBy: { id: "desc" },
    search: ["email"],
    writable: ["email", "password", "peran"],
  },
  profilPengguna: {
    select: { id: true, penggunaId: true, namaDepan: true, namaBelakang: true, nomorTelepon: true, jenisKelamin: true, newsletter: true, dibuatPada: true },
    orderBy: { id: "desc" },
    search: ["namaDepan", "namaBelakang", "nomorTelepon"],
    writable: ["penggunaId", "namaDepan", "namaBelakang", "nomorTelepon", "jenisKelamin", "newsletter"],
  },
  alamatPengguna: {
    select: { id: true, penggunaId: true, label: true, namaPenerima: true, noTelp: true, provinsi: true, kota: true, kecamatan: true, kelurahan: true, kodePos: true, alamat: true, isUtama: true, dibuatPada: true },
    orderBy: { id: "desc" },
    search: ["namaPenerima", "kota", "provinsi"],
    writable: ["penggunaId", "label", "namaPenerima", "noTelp", "provinsi", "kota", "kecamatan", "kelurahan", "kodePos", "alamat", "latitude", "longitude", "mapsUrl", "isUtama"],
  },
  kategori: {
    select: { id: true, nama: true, logo: true, header: true, body: true, dibuatPada: true },
    orderBy: { id: "desc" },
    search: ["nama"],
    writable: ["nama", "logo", "header", "body"],
  },
  kurir: {
    select: { id: true, kode: true, nama: true, logo: true, aktif: true, dibuatPada: true },
    orderBy: { id: "asc" },
    search: ["kode", "nama"],
    writable: ["kode", "nama", "logo", "aktif"],
  },
  layananPengiriman: {
    select: { id: true, kurirId: true, kode: true, nama: true, estimasiHari: true, harga: true, gratis: true, aktif: true },
    orderBy: { id: "asc" },
    search: ["kode", "nama"],
    writable: ["kurirId", "kode", "nama", "estimasiHari", "harga", "gratis", "aktif"],
  },
  pesanan: {
    select: { id: true, penggunaId: true, subtotal: true, ongkir: true, diskon: true, totalAkhir: true, status: true, namaPenerima: true, kota: true, dibuatPada: true, diubahPada: true },
    orderBy: { id: "desc" },
    search: ["namaPenerima", "kota"],
    writable: ["status", "alasanBatal", "keterangan"],
  },
  itemPesanan: {
    select: { id: true, pesananId: true, produkId: true, varianId: true, jumlah: true, harga: true },
    orderBy: { id: "desc" },
    search: [],
    writable: ["pesananId", "produkId", "varianId", "jumlah", "harga"],
  },
  pembayaran: {
    select: { id: true, pesananId: true, metode: true, provider: true, status: true, amount: true, fee: true, vaNumber: true, paidAt: true, expiredAt: true, dibuatPada: true },
    orderBy: { id: "desc" },
    search: ["vaNumber", "refId"],
    writable: ["status", "vaNumber", "paidAt"],
  },
  pengiriman: {
    select: { id: true, pesananId: true, layananId: true, biaya: true, resi: true, dibuatPada: true, diubahPada: true },
    orderBy: { id: "desc" },
    search: ["resi"],
    writable: ["layananId", "biaya", "resi"],
  },
  pengembalian: {
    select: { id: true, pesananId: true, penggunaId: true, jenis: true, alasan: true, status: true, catatanAdmin: true, resiKembali: true, dibuatPada: true },
    orderBy: { id: "desc" },
    search: ["alasan"],
    writable: ["status", "catatanAdmin", "resiKembali"],
  },
  ulasan: {
    select: { id: true, produkId: true, penggunaId: true, nama: true, email: true, rating: true, komentar: true, dibuatPada: true },
    orderBy: { id: "desc" },
    search: ["nama", "email", "komentar"],
    writable: ["produkId", "penggunaId", "email", "nama", "rating", "komentar", "foto"],
  },
  keranjang: {
    select: { id: true, penggunaId: true, aktif: true, dibuatPada: true, diubahPada: true },
    orderBy: { id: "desc" },
    search: [],
    writable: ["penggunaId", "aktif"],
  },
  itemKeranjang: {
    select: { id: true, keranjangId: true, produkId: true, varianId: true, jumlah: true },
    orderBy: { id: "desc" },
    search: [],
    writable: ["keranjangId", "produkId", "varianId", "jumlah"],
  },
  varianProduk: {
    select: { id: true, produkId: true, sku: true, stok: true, harga: true },
    orderBy: { id: "desc" },
    search: ["sku"],
    writable: ["produkId", "sku", "stok", "harga"],
  },
  varianProdukAtribut: {
    select: { id: true, varianId: true, nilaiId: true },
    orderBy: { id: "asc" },
    search: [],
    writable: ["varianId", "nilaiId"],
    filterableFields: ["varianId", "nilaiId"], // eksplisit boleh filter
  },
  atributProduk: {
    select: { id: true, produkId: true, nama: true, urutan: true },
    orderBy: { id: "asc" },
    search: ["nama"],
    writable: ["produkId", "nama", "urutan"],
  },
  nilaiAtributProduk: {
    select: { id: true, atributId: true, nilai: true, urutan: true },
    orderBy: { id: "asc" },
    search: ["nilai"],
    writable: ["atributId", "nilai", "urutan"],
  },
  provinsi: {
    select: { id: true, nama: true },
    orderBy: { id: "asc" },
    search: ["nama"],
    writable: ["id", "nama"],
    customId: "id", // string id
  },
  kabupaten: {
    select: { id: true, nama: true, provinsiId: true },
    orderBy: { id: "asc" },
    search: ["nama"],
    writable: ["id", "nama", "provinsiId"],
    customId: "id",
  },
  kecamatan: {
    select: { id: true, nama: true, kabupatenId: true },
    orderBy: { id: "asc" },
    search: ["nama"],
    writable: ["id", "nama", "kabupatenId"],
    customId: "id",
  },
  kelurahan: {
    select: { id: true, nama: true, kecamatanId: true },
    orderBy: { id: "asc" },
    search: ["nama"],
    writable: ["id", "nama", "kecamatanId"],
    customId: "id",
  },
};

// ── Helper: validasi model
function getConfig(modelName) {
  const cfg = MODEL_CONFIG[modelName];
  if (!cfg) return null;
  if (!prisma[modelName]) return null;
  return cfg;
}

// ── Helper: parse angka/bool dari body
function castValue(val) {
  if (val === "" || val === undefined) return undefined;
  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null") return null;
  const n = Number(val);
  if (!isNaN(n) && val !== "" && typeof val === "string" && /^-?\d+(\.\d+)?$/.test(val)) return n;
  return val;
}

function buildWritableData(cfg, body) {
  const data = {};
  for (const key of cfg.writable) {
    if (!(key in body)) continue;
    const val = castValue(body[key]);
    if (val !== undefined) data[key] = val;
  }
  return data;
}

// ──────────────────────────────────────────────
// GET /api/admin/data/:model
// Query: page, limit, search, [field]=value
// ──────────────────────────────────────────────
router.get("/:model", async (req, res) => {
  try {
    const cfg = getConfig(req.params.model);
    if (!cfg) return res.status(404).json({ message: "Model tidak ditemukan" });

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build where clause
    const where = {};

    // Search
    if (search && cfg.search.length > 0) {
      where.OR = cfg.search.map((field) => ({
        [field]: { contains: search, mode: "insensitive" },
      }));
    }

    // Filter tambahan dari query (field=value)
    const reservedKeys = ["page", "limit", "search"];
    for (const [key, val] of Object.entries(req.query)) {
      if (reservedKeys.includes(key)) continue;
      // Gunakan filterableFields jika ada, fallback ke select keys
      const allowedKeys = cfg.filterableFields || Object.keys(cfg.select || {});
      if (!allowedKeys.includes(key)) continue;
      const casted = castValue(val);
      if (casted !== undefined) where[key] = casted;
    }

    const [total, data] = await Promise.all([
      prisma[req.params.model].count({ where }),
      prisma[req.params.model].findMany({
        where,
        select: cfg.select,
        orderBy: cfg.orderBy,
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.error(`GET /data/${req.params.model}`, e);
    res.status(500).json({ message: e.message });
  }
});

// ──────────────────────────────────────────────
// GET /api/admin/data/:model/:id
// ──────────────────────────────────────────────
router.get("/:model/:id", async (req, res) => {
  try {
    const cfg = getConfig(req.params.model);
    if (!cfg) return res.status(404).json({ message: "Model tidak ditemukan" });

    const idRaw = req.params.id;
    const id = cfg.customId ? idRaw : Number(idRaw);

    const data = await prisma[req.params.model].findUnique({
      where: { id },
      select: cfg.select,
    });

    if (!data) return res.status(404).json({ message: "Data tidak ditemukan" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ──────────────────────────────────────────────
// POST /api/admin/data/:model
// ──────────────────────────────────────────────
router.post("/:model", async (req, res) => {
  try {
    const cfg = getConfig(req.params.model);
    if (!cfg) return res.status(404).json({ message: "Model tidak ditemukan" });

    const data = buildWritableData(cfg, req.body);
    if (Object.keys(data).length === 0)
      return res.status(400).json({ message: "Tidak ada field yang valid untuk disimpan" });

    const created = await prisma[req.params.model].create({ data });
    res.status(201).json(created);
  } catch (e) {
    console.error(`POST /data/${req.params.model}`, e);
    if (e.code === "P2002") return res.status(409).json({ message: "Data duplikat (unique constraint)" });
    if (e.code === "P2003") return res.status(400).json({ message: "Relasi tidak ditemukan (foreign key)" });
    res.status(500).json({ message: e.message });
  }
});

// ──────────────────────────────────────────────
// PUT /api/admin/data/:model/:id
// ──────────────────────────────────────────────
router.put("/:model/:id", async (req, res) => {
  try {
    const cfg = getConfig(req.params.model);
    if (!cfg) return res.status(404).json({ message: "Model tidak ditemukan" });

    const idRaw = req.params.id;
    const id = cfg.customId ? idRaw : Number(idRaw);

    const data = buildWritableData(cfg, req.body);
    if (Object.keys(data).length === 0)
      return res.status(400).json({ message: "Tidak ada field yang diubah" });

    const updated = await prisma[req.params.model].update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (e) {
    console.error(`PUT /data/${req.params.model}`, e);
    if (e.code === "P2025") return res.status(404).json({ message: "Data tidak ditemukan" });
    if (e.code === "P2002") return res.status(409).json({ message: "Data duplikat (unique constraint)" });
    res.status(500).json({ message: e.message });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/admin/data/:model/:id
// ──────────────────────────────────────────────
router.delete("/:model/:id", async (req, res) => {
  try {
    const cfg = getConfig(req.params.model);
    if (!cfg) return res.status(404).json({ message: "Model tidak ditemukan" });

    const idRaw = req.params.id;
    const id = cfg.customId ? idRaw : Number(idRaw);

    await prisma[req.params.model].delete({ where: { id } });
    res.json({ message: "Data berhasil dihapus" });
  } catch (e) {
    console.error(`DELETE /data/${req.params.model}`, e);
    if (e.code === "P2025") return res.status(404).json({ message: "Data tidak ditemukan" });
    if (e.code === "P2003") return res.status(409).json({ message: "Tidak bisa dihapus, masih ada relasi data lain" });
    res.status(500).json({ message: e.message });
  }
});

// ──────────────────────────────────────────────
// GET /api/admin/data (list semua model yg tersedia)
// ──────────────────────────────────────────────
router.get("/", (req, res) => {
  res.json({ models: Object.keys(MODEL_CONFIG) });
});

export default router;