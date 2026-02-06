import express from "express";
import prisma from "../../prisma.js";

const router = express.Router();

// ✅ LIST kategori (admin) + jumlah produk (_count)
router.get("/", async (req, res) => {
  try {
    const data = await prisma.kategori.findMany({
      orderBy: { id: "desc" },
      include: {
        _count: { select: { produk: true } },
      },
    });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Gagal ambil kategori" });
  }
});

// ✅ DETAIL kategori (admin)
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });

    const data = await prisma.kategori.findUnique({
      where: { id },
      include: {
        _count: { select: { produk: true } },
      },
    });

    if (!data) return res.status(404).json({ message: "Kategori tidak ditemukan" });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Gagal ambil detail kategori" });
  }
});

// ✅ TAMBAH kategori (admin) + header/body
router.post("/", async (req, res) => {
  try {
    const { nama, header, body } = req.body;

    if (!nama || !String(nama).trim()) {
      return res.status(400).json({ message: "Nama kategori wajib diisi" });
    }

    const created = await prisma.kategori.create({
      data: {
        nama: String(nama).trim(),
        header: header != null ? Boolean(header) : undefined,
        body: body != null ? Boolean(body) : undefined,
      },
    });

    res.status(201).json(created);
  } catch (e) {
    console.error(e);

    if (e?.code === "P2002") {
      return res.status(409).json({ message: "Nama kategori sudah ada" });
    }

    res.status(500).json({ message: "Gagal tambah kategori" });
  }
});

// ✅ EDIT kategori (admin) + header/body
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });

    const { nama, header, body } = req.body;

    if (nama !== undefined && !String(nama).trim()) {
      return res.status(400).json({ message: "Nama kategori wajib diisi" });
    }

    const updated = await prisma.kategori.update({
      where: { id },
      data: {
        nama: nama !== undefined ? String(nama).trim() : undefined,
        header: header != null ? Boolean(header) : undefined,
        body: body != null ? Boolean(body) : undefined,
      },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);

    if (e?.code === "P2025") {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }
    if (e?.code === "P2002") {
      return res.status(409).json({ message: "Nama kategori sudah ada" });
    }

    res.status(500).json({ message: "Gagal edit kategori" });
  }
});

// ✅ HAPUS kategori (admin)
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });

    await prisma.kategori.delete({ where: { id } });
    res.json({ message: "Kategori berhasil dihapus" });
  } catch (e) {
    console.error(e);

    if (e?.code === "P2025") {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }

    res.status(500).json({ message: "Gagal hapus kategori (mungkin masih dipakai produk)" });
  }
});

export default router;
