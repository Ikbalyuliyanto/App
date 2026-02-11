import express from "express";
import prisma from "../../prisma.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { uploadMemory } from "../../middleware/upload.js";

const router = express.Router();

// ===== Path helpers (untuk akses folder uploads di root project)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// routes/admin/produk.js -> app/src/routes/admin
// rootDir = zawawiya/
const rootDir = path.join(__dirname, "..", "..", "..", "..");
const uploadsRoot = path.join(rootDir, "uploads");

// ===== helper bikin folder
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// ===== helper format folder id 6 digit: 1 -> 000001
function padProductId(id) {
  return String(id).padStart(6, "0");
}

// ===== helper simpan webp (overwrite)
async function saveWebp(buffer, outPath, maxKB = 80) {
  let quality = 80;
  let output;

  do {
    output = await sharp(buffer)
      .rotate()
      .resize({ width: 1024, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    quality -= 5;
  } while (output.length > maxKB * 1024 && quality >= 30);

  await fs.promises.writeFile(outPath, output);

  return {
    sizeKB: Math.round(output.length / 1024),
    qualityUsed: quality + 5,
  };
}

// ✅ LIST produk
router.get("/", async (req, res) => {
  try {
    const data = await prisma.produk.findMany({
      include: { kategori: true },
      orderBy: { id: "desc" },
    });
    res.json(data);
  } catch (e) {
    console.error("GET /api/admin/produk ERROR:", e);
    res.status(500).json({ message: e.message || "Gagal ambil produk" });
  }
});

// ✅ DETAIL produk
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });

    const data = await prisma.produk.findUnique({
      where: { id },
      include: {
        kategori: true,
        galeri: true,
        atributProduk: { include: { nilai: true } },
        varianProduk: { include: { atribut: true } },
      },
    });

    if (!data) return res.status(404).json({ message: "Produk tidak ditemukan" });
    res.json(data);
  } catch (e) {
    console.error("GET /api/admin/produk/:id ERROR:", e);
    res.status(500).json({ message: e.message || "Gagal ambil detail produk" });
  }
});

// ✅ TAMBAH produk (tanpa gambar dulu, gambar via upload endpoint)
router.post("/", async (req, res) => {
  try {
    const {
      nama,
      kategoriId,
      harga,
      stokProduk,
      merek,
      deskripsi,
      urlproduk,
      gratisOngkir,
      hargaAsli,
      diskonPersen,
      aktif, 
      flashsale, 
      terlaris, 
      untukmu,
      atributProduk,
    } = req.body;

    if (!nama || !kategoriId || harga == null) {
      return res.status(400).json({ message: "Nama, kategoriId, dan harga wajib diisi" });
    }

    const atributCreate = Array.isArray(atributProduk)
      ? atributProduk
          .filter((a) => a && a.nama && Array.isArray(a.nilai) && a.nilai.length > 0)
          .map((a, idx) => ({
            nama: String(a.nama),
            urutan: Number(a.urutan ?? idx),
            nilai: {
              create: a.nilai
                .filter((v) => v && v.nilai)
                .map((v, j) => ({
                  nilai: String(v.nilai),
                  urutan: Number(v.urutan ?? j),
                })),
            },
          }))
      : [];

    const created = await prisma.produk.create({
      data: {
        nama: String(nama),
        kategoriId: Number(kategoriId),
        harga: Number(harga),
        stokProduk: stokProduk != null ? Number(stokProduk) : 0,
        merek: merek ? String(merek) : null,
        deskripsi: deskripsi ? String(deskripsi) : null,
        urlproduk: urlproduk ? String(urlproduk) : null,
        gratisOngkir: Boolean(gratisOngkir),
        hargaAsli: hargaAsli != null ? Number(hargaAsli) : null,
        diskonPersen: diskonPersen != null ? Number(diskonPersen) : null,
        aktif: aktif != null ? Boolean(aktif) : null,
        flashsale: flashsale != null ? Boolean(flashsale) : null,
        terlaris: terlaris != null ? Boolean(terlaris) : null,
        untukmu: untukmu != null ? Boolean(untukmu) : null,

        ...(atributCreate.length ? { atributProduk: { create: atributCreate } } : {}),
      },
    });

    res.status(201).json(created);
  } catch (e) {
    console.error("POST /api/admin/produk ERROR:", e);
    res.status(500).json({ message: e.message || "Gagal menambahkan produk" });
  }
});

// ✅ UPDATE produk (update basic + optional update galeri via array path)
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });

    const {
      // basic produk
      nama,
      kategoriId,
      harga,
      stokProduk,
      merek,
      deskripsi,
      urlproduk,
      gratisOngkir,
      hargaAsli,
      diskonPersen,
      aktif,
      flashsale, 
      terlaris, 
      untukmu,
      gambarUtama,

      // relasi
      galeri,        // [{url, urutan, alt}]
      atributProduk, // [{id?, nama, urutan?, nilai:[{id?, nilai, urutan?}]}]
      // varian jangan di sini (pakai endpoint /variants)
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1) update basic produk
      await tx.produk.update({
        where: { id },
        data: {
          nama: nama != null ? String(nama) : undefined,
          kategoriId: kategoriId != null ? Number(kategoriId) : undefined,
          harga: harga != null ? Number(harga) : undefined,
          stokProduk: stokProduk != null ? Number(stokProduk) : undefined,
          merek: merek !== undefined ? (merek ? String(merek) : null) : undefined,
          deskripsi: deskripsi !== undefined ? (deskripsi ? String(deskripsi) : null) : undefined,
          urlproduk: urlproduk !== undefined ? (urlproduk ? String(urlproduk) : null) : undefined,
          gratisOngkir: gratisOngkir != null ? Boolean(gratisOngkir) : undefined,
          hargaAsli: hargaAsli !== undefined ? (hargaAsli != null ? Number(hargaAsli) : null) : undefined,
          diskonPersen: diskonPersen !== undefined ? (diskonPersen != null ? Number(diskonPersen) : null) : undefined,
          aktif: aktif != null ? Boolean(aktif) : undefined,
          flashsale: flashsale != null ? Boolean(flashsale) : undefined,
          terlaris: terlaris != null ? Boolean(terlaris) : undefined,
          untukmu: untukmu != null ? Boolean(untukmu) : undefined,
          gambarUtama: gambarUtama !== undefined ? (gambarUtama ? String(gambarUtama) : null) : undefined,
        },
      });

      // 2) GALERI: replace aman (tidak jadi FK varian)
      if (Array.isArray(galeri)) {
        await tx.produkGambar.deleteMany({ where: { produkId: id } });

        const rows = galeri
          .filter((g) => g?.url)
          .map((g, i) => ({
            produkId: id,
            url: String(g.url),
            urutan: Number(g.urutan ?? i + 1),
            alt: g.alt ? String(g.alt) : null,
          }));

        if (rows.length) await tx.produkGambar.createMany({ data: rows });
      }

      // 3) ATRIBUT + NILAI: UPDATE/CREATE/DELETE selektif (TIDAK replace-all)
      if (Array.isArray(atributProduk)) {
        // ambil kondisi DB sekarang
        const existingAttrs = await tx.atributProduk.findMany({
          where: { produkId: id },
          include: { nilai: true },
          orderBy: { urutan: "asc" },
        });

        const incomingAttrs = atributProduk
          .filter((a) => a && a.nama && Array.isArray(a.nilai))
          .map((a, idx) => ({
            id: a.id,
            nama: String(a.nama),
            urutan: Number(a.urutan ?? idx),
            nilai: a.nilai
              .filter((v) => v && v.nilai)
              .map((v, j) => ({
                id: v.id,
                nilai: String(v.nilai),
                urutan: Number(v.urutan ?? j),
              })),
          }));

        const incomingAttrIdSet = new Set(
          incomingAttrs
            .map((a) => Number(a.id))
            .filter((x) => Number.isInteger(x) && x > 0)
        );

        // helper: cek nilaiId dipakai varian
        async function assertNilaiNotUsed(nilaiIds, messagePrefix) {
          if (!nilaiIds.length) return;
          const used = await tx.varianProdukAtribut.findFirst({
            where: { nilaiId: { in: nilaiIds } },
            select: { id: true },
          });
          if (used) {
            // 409 supaya FE bisa tampilkan pesan
            const err = new Error(`${messagePrefix} masih dipakai varian. Hapus/ubah varian dulu.`);
            err.statusCode = 409;
            throw err;
          }
        }

        // A) update / create atribut dan nilai
        for (const a of incomingAttrs) {
          const attrIdNum = Number(a.id);
          const isExistingAttr = Number.isInteger(attrIdNum) && attrIdNum > 0;

          if (isExistingAttr) {
            // update atribut existing
            await tx.atributProduk.update({
              where: { id: attrIdNum },
              data: { nama: a.nama, urutan: a.urutan },
            });

            const dbAttr = existingAttrs.find((x) => x.id === attrIdNum);
            const dbValues = dbAttr?.nilai || [];
            const incomingValIdSet = new Set(
              a.nilai
                .map((v) => Number(v.id))
                .filter((x) => Number.isInteger(x) && x > 0)
            );

            // update/create nilai
            for (const v of a.nilai) {
              const valIdNum = Number(v.id);
              const isExistingVal = Number.isInteger(valIdNum) && valIdNum > 0;

              if (isExistingVal) {
                await tx.nilaiAtributProduk.update({
                  where: { id: valIdNum },
                  data: { nilai: v.nilai, urutan: v.urutan },
                });
              } else {
                await tx.nilaiAtributProduk.create({
                  data: { atributId: attrIdNum, nilai: v.nilai, urutan: v.urutan },
                });
              }
            }

            // delete nilai yang dihapus user (yang ada di DB tapi tidak ada di payload)
            const removedDbVals = dbValues.filter((dv) => !incomingValIdSet.has(dv.id));
            const removedIds = removedDbVals.map((x) => x.id);

            // jangan boleh hapus kalau dipakai varian
            await assertNilaiNotUsed(removedIds, `Nilai atribut "${a.nama}"`);

            if (removedIds.length) {
              await tx.nilaiAtributProduk.deleteMany({ where: { id: { in: removedIds } } });
            }
          } else {
            // create atribut baru + nilai
            await tx.atributProduk.create({
              data: {
                produkId: id,
                nama: a.nama,
                urutan: a.urutan,
                nilai: {
                  create: a.nilai.map((v) => ({
                    nilai: v.nilai,
                    urutan: v.urutan,
                  })),
                },
              },
            });
          }
        }

        // B) hapus atribut yang dihapus user (ada di DB tapi tidak ada di payload)
        const removedAttrs = existingAttrs.filter((ea) => !incomingAttrIdSet.has(ea.id));
        for (const ra of removedAttrs) {
          // cek semua nilai atribut ini dipakai varian?
          const nilaiIds = (ra.nilai || []).map((v) => v.id);
          await assertNilaiNotUsed(nilaiIds, `Atribut "${ra.nama}"`);

          // hapus nilai dulu, baru atribut
          if (nilaiIds.length) {
            await tx.nilaiAtributProduk.deleteMany({ where: { id: { in: nilaiIds } } });
          }
          await tx.atributProduk.delete({ where: { id: ra.id } });
        }
      }

      // final response
      return tx.produk.findUnique({
        where: { id },
        include: {
          kategori: true,
          galeri: { orderBy: { urutan: "asc" } },
          atributProduk: {
            orderBy: { urutan: "asc" },
            include: { nilai: { orderBy: { urutan: "asc" } } },
          },
          varianProduk: { include: { atribut: { include: { nilai: true } } } },
        },
      });
    });

    res.json(result);
  } catch (e) {
    console.error("PUT /api/admin/produk/:id ERROR:", e);

    if (e?.code === "P2025") return res.status(404).json({ message: "Produk tidak ditemukan" });

    // unique violation (misalnya nama atribut duplikat untuk produk)
    if (e?.code === "P2002") {
      return res.status(409).json({ message: "Duplikat data (atribut/nilai/SKU). Cek nama atribut atau nilai." });
    }

    // custom 409 dari assertNilaiNotUsed
    if (e?.statusCode === 409) {
      return res.status(409).json({ message: e.message });
    }

    res.status(500).json({ message: e.message || "Gagal mengubah produk" });
  }
});

/**
 * ============================================================
 * ✅ UPLOAD ENDPOINTS
 * ============================================================
 * FE akan POST multipart/form-data dengan field name: "image"
 */

// ✅ Upload gambar utama => uploads/products/000123/main.webp
router.post("/:id/upload-main", uploadMemory.single("image"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });
    if (!req.file) return res.status(400).json({ message: "File image wajib dikirim (field: image)" });

    const folderId = padProductId(id);
    const productDir = path.join(uploadsRoot, "products", folderId);
    ensureDir(productDir);

    const outPath = path.join(productDir, "main.webp");
    await saveWebp(req.file.buffer, outPath);

    // path yang disimpan ke DB (tanpa domain)
    const publicPath = `/uploads/products/${folderId}/main.webp`;

    // optional: langsung update DB
    await prisma.produk.update({
      where: { id },
      data: { gambarUtama: publicPath },
    });

    res.json({ path: publicPath });
  } catch (e) {
    console.error("POST upload-main ERROR:", e);
    res.status(500).json({ message: e.message || "Gagal upload gambar utama" });
  }
});

// ✅ Upload gallery => uploads/products/000123/gallery/01.webp, 02.webp, dst
router.post("/:id/upload-gallery", uploadMemory.single("image"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });
    if (!req.file) return res.status(400).json({ message: "File image wajib dikirim (field: image)" });

    const slotRaw = req.body?.slot;
    const slotNum = Number(slotRaw);
    const slot = Number.isFinite(slotNum) && slotNum > 0 ? slotNum : 1;

    const folderId = padProductId(id);
    const galleryDir = path.join(uploadsRoot, "products", folderId, "gallery");
    ensureDir(galleryDir);

    const fileName = String(slot).padStart(2, "0") + ".webp";
    const outPath = path.join(galleryDir, fileName);

    await saveWebp(req.file.buffer, outPath);

    const publicPath = `/uploads/products/${folderId}/gallery/${fileName}`;

    // optional: upsert ke tabel galeri
    // strategi simple: deleteMany + createMany dilakukan saat PUT produk
    // jadi di sini cukup return path
    res.json({ path: publicPath });
  } catch (e) {
    console.error("POST upload-gallery ERROR:", e);
    res.status(500).json({ message: e.message || "Gagal upload gallery" });
  }
});
// ===============================
// HELPERS: AUTO GENERATE VARIANTS
// ===============================
function cartesianProduct(arrays) {
  return arrays.reduce((acc, curr) => {
    const out = [];
    for (const a of acc) for (const b of curr) out.push([...a, b]);
    return out;
  }, [[]]);
}

function makeSku(produkId, nilaiIds) {
  // SKU deterministik & unik
  // contoh: P000123-10-22-31
  return `P${String(produkId).padStart(6, "0")}-${nilaiIds.join("-")}`;
}

async function generateVariantsFromDb(tx, produkId, { defaultHarga, defaultStok }) {
  const attrs = await tx.atributProduk.findMany({
    where: { produkId },
    orderBy: { urutan: "asc" },
    include: { nilai: { orderBy: { urutan: "asc" } } },
  });

  if (!attrs.length) return { created: 0, reason: "NO_ATTR" };

  const nilaiPerAttr = attrs.map((a) =>
    (a.nilai || []).map((v) => v.id).filter(Boolean)
  );

  if (nilaiPerAttr.some((list) => list.length === 0))
    return { created: 0, reason: "EMPTY_VALUE" };

  const combos = cartesianProduct(nilaiPerAttr);

  // ===============================
  // 1️⃣ INSERT VARIAN (createMany)
  // ===============================
  const variantRows = combos.map((nilaiIds) => ({
    produkId,
    sku: makeSku(produkId, nilaiIds),
    stok: Number(defaultStok || 0),
    harga: defaultHarga != null ? Number(defaultHarga) : null,
  }));

  await tx.varianProduk.createMany({
    data: variantRows,
  });

  // ===============================
  // 2️⃣ AMBIL ULANG VARIAN YANG BARU DIBUAT
  // ===============================
  const createdVariants = await tx.varianProduk.findMany({
    where: { produkId },
    select: { id: true, sku: true },
  });

  const skuToId = new Map(
    createdVariants.map((v) => [v.sku, v.id])
  );

  // ===============================
  // 3️⃣ BULK INSERT JOIN TABLE
  // ===============================
  const joinRows = [];

  for (const nilaiIds of combos) {
    const sku = makeSku(produkId, nilaiIds);
    const varianId = skuToId.get(sku);

    for (const nilaiId of nilaiIds) {
      joinRows.push({
        varianId,
        nilaiId,
      });
    }
  }

  if (joinRows.length) {
    await tx.varianProdukAtribut.createMany({
      data: joinRows,
    });
  }

  return { created: combos.length, reason: "OK" };
}


// =====================================
// ✅ PUT /api/admin/produk/:id/variants
// =====================================
// =====================================
// ✅ PUT /api/admin/produk/:id/variants
// =====================================
router.put("/:id/variants", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID tidak valid" });
    }

    const { varianProduk, autoGenerate } = req.body;

    const result = await prisma.$transaction(
      async (tx) => {
        // =========================
        // 1️⃣ Ambil produk
        // =========================
        const produk = await tx.produk.findUnique({
          where: { id },
          select: { id: true, harga: true, stokProduk: true },
        });

        if (!produk) {
          const err = new Error("Produk tidak ditemukan");
          err.statusCode = 404;
          throw err;
        }

        // =========================
        // 2️⃣ Hapus semua varian lama
        // =========================
        await tx.varianProdukAtribut.deleteMany({
          where: { varian: { produkId: id } },
        });

        await tx.varianProduk.deleteMany({
          where: { produkId: id },
        });

        // =========================
        // 3️⃣ MODE AUTO GENERATE
        // =========================
        const shouldAuto =
          autoGenerate === true ||
          !Array.isArray(varianProduk) ||
          varianProduk.length === 0;

        if (shouldAuto) {
          const info = await generateVariantsFromDb(tx, id, {
            defaultHarga: produk.harga,
            defaultStok: produk.stokProduk,
          });

          const after = await tx.produk.findUnique({
            where: { id },
            include: {
              varianProduk: {
                include: { atribut: true },
              },
            },
          });

          return { ...after, _auto: info };
        }

        // =========================
        // 4️⃣ MODE MANUAL (OPTIMIZED)
        // =========================
        if (!Array.isArray(varianProduk)) {
          const err = new Error("varianProduk harus array");
          err.statusCode = 400;
          throw err;
        }

        if (varianProduk.length === 0) {
          return tx.produk.findUnique({
            where: { id },
            include: { varianProduk: true },
          });
        }

        // 4.1 Validasi + siapkan varian rows
        const variantRows = varianProduk.map((v) => {
          if (!v.sku) {
            const err = new Error("SKU wajib diisi pada manual mode");
            err.statusCode = 400;
            throw err;
          }

          return {
            produkId: id,
            sku: String(v.sku),
            stok: v.stok != null ? Number(v.stok) : 0,
            harga: v.harga != null ? Number(v.harga) : null,
          };
        });

        // 4.2 Bulk insert varian
        await tx.varianProduk.createMany({
          data: variantRows,
        });

        // 4.3 Ambil varian yang baru dibuat
        const createdVariants = await tx.varianProduk.findMany({
          where: {
            produkId: id,
            sku: { in: variantRows.map((v) => v.sku) },
          },
          select: { id: true, sku: true },
        });

        const skuToId = new Map(
          createdVariants.map((v) => [v.sku, v.id])
        );

        // 4.4 Siapkan join table rows
        const joinRows = [];

        for (const v of varianProduk) {
          const varianId = skuToId.get(String(v.sku));
          if (!varianId) continue;

          const attrs = Array.isArray(v.atribut) ? v.atribut : [];

          for (const a of attrs) {
            if (a?.nilaiId != null) {
              joinRows.push({
                varianId,
                nilaiId: Number(a.nilaiId),
              });
            }
          }
        }

        // Remove duplicate
        const uniqueJoinRows = Array.from(
          new Map(
            joinRows.map((r) => [`${r.varianId}-${r.nilaiId}`, r])
          ).values()
        );

        if (uniqueJoinRows.length) {
          await tx.varianProdukAtribut.createMany({
            data: uniqueJoinRows,
          });
        }

        // =========================
        // 5️⃣ Return hasil akhir
        // =========================
        return tx.produk.findUnique({
          where: { id },
          include: {
            varianProduk: {
              include: {
                atribut: {
                  include: { nilai: true },
                },
              },
            },
          },
        });
      },
      {
        timeout: 20000, // 🔥 penting supaya tidak timeout 5 detik
      }
    );

    res.json(result);
  } catch (e) {
    console.error("PUT /:id/variants ERROR:", e);

    if (e?.statusCode === 404) {
      return res.status(404).json({ message: e.message });
    }

    if (e?.statusCode === 400) {
      return res.status(400).json({ message: e.message });
    }

    if (e?.code === "P2002") {
      return res.status(409).json({ message: "SKU duplikat" });
    }

    res.status(500).json({
      message: e.message || "Gagal menyimpan varian",
    });
  }
});

// ✅ DELETE produk (+ bersihin folder uploads)
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });

    await prisma.produk.delete({ where: { id } });

    // optional: hapus folder uploads product
    const folderId = padProductId(id);
    const productDir = path.join(uploadsRoot, "products", folderId);
    if (fs.existsSync(productDir)) fs.rmSync(productDir, { recursive: true, force: true });

    res.json({ message: "Produk berhasil dihapus" });
  } catch (e) {
    console.error("DELETE /api/admin/produk/:id ERROR:", e);
    if (e?.code === "P2025") return res.status(404).json({ message: "Produk tidak ditemukan" });
    res.status(409).json({ message: "Gagal hapus produk. Pastikan tidak sedang dipakai relasi lain." });
  }
});
export default router;
