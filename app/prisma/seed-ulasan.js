// seed-ulasan.js — HANYA UNTUK TESTING/DEVELOPMENT
// Jalankan: node seed-ulasan.js
// Hapus data: node seed-ulasan.js --clean

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ── Produk ID dari screenshot ──────────────────
const PRODUK_IDS = [23, 6, 5, 10, 13, 9, 12, 7, 16, 15, 14, 17, 22, 20, 19, 18, 28, 27, 25, 21, 26, 24, 11, 8];

// ── Konfigurasi ────────────────────────────────
const ULASAN_PER_PRODUK = 50; // ganti sesuai kebutuhan testing

// ── Data dummy ─────────────────────────────────
const KOMENTAR = [
  "Produknya bagus banget, sesuai ekspektasi!",
  "Kualitas oke, pengiriman cepat. Recommended!",
  "Bahan nyaman dipakai, jahitan rapi. Puas!",
  "Ukuran sesuai deskripsi, warna cantik.",
  "Pelayanan ramah, produk memuaskan.",
  "Sudah beli berkali-kali, selalu puas.",
  "Kualitas premium, harga terjangkau.",
  "Cocok banget untuk sehari-hari, adem.",
  "Packaging aman, produk sampai dalam kondisi baik.",
  "Sesuai foto, tidak mengecewakan.",
  "Bahan adem dan nyaman, suka banget!",
  "Pengiriman cepat, produk bagus.",
  "Recommended seller, produk original.",
  "Warna sesuai foto, bahan bagus.",
  "Puas dengan pembelian ini, akan beli lagi.",
  "Jahitan rapi dan kuat, bahan berkualitas.",
  "Harga sepadan dengan kualitas.",
  "Sangat memuaskan, bakal repeat order.",
  "Produk sesuai deskripsi, aman dibeli.",
  "Seller fast respon, produk memuaskan.",
  null, // beberapa tanpa komentar
  null,
  null,
];

const DOMAIN_EMAIL = [
  "gmail.com", "yahoo.com", "hotmail.com",
  "outlook.com", "icloud.com", "mail.com",
];

// Rating dengan distribusi realistis (lebih banyak rating bagus)
const RATING_POOL = [5, 5, 5, 5, 5, 4, 4, 4, 4, 5, 3, 3, 3];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomEmail(idx) {
  const adjectives = ["citra","siti","dewi","rina","yuni","lisa","maya","dina","fitri","ayu",
                      "budi","andi","reza","fajar","rizki","dimas","hadi","bayu","eko","joko"];
  const nouns      = ["cantik","manis","indah","jelita","molek","lestari","pertiwi","wulan","bulan","bintang"];
  const name       = randomItem(adjectives) + randomItem(nouns) + randomInt(1, 999);
  const domain     = randomItem(DOMAIN_EMAIL);
  return `${name}${idx}@${domain}`;
}

function randomNama() {
  const depan  = ["Siti","Dewi","Rina","Maya","Fitri","Ayu","Citra","Yuni","Lisa","Dina",
                  "Budi","Andi","Reza","Fajar","Rizki","Dimas","Hadi","Bayu","Eko","Joko"];
  const belakang = ["Rahayu","Pertiwi","Lestari","Wulandari","Kusuma","Putri","Sari","Dewi",
                    "Santoso","Wijaya","Susanto","Pratama","Kurniawan","Hidayat","Nugroho"];
  return `${randomItem(depan)} ${randomItem(belakang)}`;
}

function randomTanggal() {
  // Acak antara 1 bulan lalu sampai hari ini
  const now  = new Date();
  const past = new Date(now - 30 * 24 * 60 * 60 * 1000); // 30 hari lalu
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

// ── Main ───────────────────────────────────────
async function main() {
  const isClean = process.argv.includes("--clean");

  if (isClean) {
    console.log("🧹 Menghapus semua ulasan seed testing...");
    const del = await prisma.ulasan.deleteMany({
      where: { email: { contains: "@" }, penggunaId: null },
    });
    console.log(`✅ Berhasil hapus ${del.count} ulasan`);
    return;
  }

  console.log(`🚀 Mulai seed ${ULASAN_PER_PRODUK} ulasan x ${PRODUK_IDS.length} produk = ${ULASAN_PER_PRODUK * PRODUK_IDS.length} total\n`);

  let totalBerhasil = 0;
  let globalIdx     = 0;

  for (const produkId of PRODUK_IDS) {
    // Cek produk ada
    const produk = await prisma.produk.findUnique({
      where : { id: produkId },
      select: { id: true, nama: true },
    });

    if (!produk) {
      console.log(`⚠️  Produk #${produkId} tidak ditemukan, skip.`);
      continue;
    }

    // Buat ulasan batch
    const data = Array.from({ length: ULASAN_PER_PRODUK }, (_, i) => {
      globalIdx++;
      return {
        produkId,
        penggunaId: null,                          // tidak terikat user nyata
        email     : randomEmail(globalIdx),
        nama      : randomNama(),
        pesananId : null,
        rating    : randomItem(RATING_POOL),
        komentar  : randomItem(KOMENTAR),
        foto      : null,
        dibuatPada: randomTanggal(),
      };
    });

    await prisma.ulasan.createMany({ data });
    totalBerhasil += data.length;

    // Hitung rata-rata rating dari DB
    const agg = await prisma.ulasan.aggregate({
      where : { produkId },
      _avg  : { rating: true },
      _count: { rating: true },
    });

    console.log(`✅ Produk #${produkId} "${produk.nama.slice(0, 30)}..." → ${data.length} ulasan | rating rata: ${Number(agg._avg.rating || 0).toFixed(2)} dari ${agg._count.rating} ulasan`);
  }

  console.log(`\n🎉 Selesai! Total ${totalBerhasil} ulasan berhasil dibuat.`);
  console.log(`\n💡 Untuk hapus data testing: node seed-ulasan.js --clean`);
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());