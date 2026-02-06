import { PrismaClient, Peran } from "@prisma/client";

const prisma = new PrismaClient();

async function seedAdmin() {
  await prisma.pengguna.upsert({
    where: { email: "admin@zawawiya.com" },
    update: { password: "admin123", peran: Peran.ADMIN },
    create: { email: "admin@zawawiya.com", password: "admin123", peran: Peran.ADMIN },
  });
}

async function seedKategori() {
  const smartphone = await prisma.kategori.upsert({
    where: { nama: "Smartphone" },
    update: {},
    create: { nama: "Smartphone" },
  });

  const fashion = await prisma.kategori.upsert({
    where: { nama: "Fashion" },
    update: {},
    create: { nama: "Fashion" },
  });

  return { smartphone, fashion };
}

async function seedKurirDanLayanan() {
  const jne = await prisma.kurir.upsert({
    where: { kode: "JNE" },
    update: { nama: "JNE", aktif: true },
    create: { kode: "JNE", nama: "JNE", aktif: true },
  });

  const sicepat = await prisma.kurir.upsert({
    where: { kode: "SICEPAT" },
    update: { nama: "SiCepat", aktif: true },
    create: { kode: "SICEPAT", nama: "SiCepat", aktif: true },
  });

  await prisma.layananPengiriman.upsert({
    where: { kurirId_kode: { kurirId: jne.id, kode: "REG" } },
    update: { nama: "JNE Regular", estimasiHari: "3-5", harga: 0, gratis: true, aktif: true },
    create: {
      kurirId: jne.id,
      kode: "REG",
      nama: "JNE Regular",
      estimasiHari: "3-5",
      harga: 0,
      gratis: true,
      aktif: true,
    },
  });

  await prisma.layananPengiriman.upsert({
    where: { kurirId_kode: { kurirId: jne.id, kode: "EXPRESS" } },
    update: { nama: "JNE Express", estimasiHari: "1-2", harga: 25000, gratis: false, aktif: true },
    create: {
      kurirId: jne.id,
      kode: "EXPRESS",
      nama: "JNE Express",
      estimasiHari: "1-2",
      harga: 25000,
      gratis: false,
      aktif: true,
    },
  });

  await prisma.layananPengiriman.upsert({
    where: { kurirId_kode: { kurirId: sicepat.id, kode: "REG" } },
    update: { nama: "SiCepat Reguler", estimasiHari: "3-4", harga: 15000, gratis: false, aktif: true },
    create: {
      kurirId: sicepat.id,
      kode: "REG",
      nama: "SiCepat Reguler",
      estimasiHari: "3-4",
      harga: 15000,
      gratis: false,
      aktif: true,
    },
  });
}

// OPTIONAL: kalau kamu mau pakai helper ini, ini versi JS (tanpa type)
async function resetProdukByNama(nama) {
  const existing = await prisma.produk.findFirst({ where: { nama } });
  if (!existing) return false;

  await prisma.itemKeranjang.deleteMany({ where: { produkId: existing.id } });
  await prisma.itemPesanan.deleteMany({ where: { produkId: existing.id } });

  await prisma.produkGambar.deleteMany({ where: { produkId: existing.id } });

  const varian = await prisma.varianProduk.findMany({
    where: { produkId: existing.id },
    select: { id: true },
  });
  const varianIds = varian.map((v) => v.id);

  if (varianIds.length) {
    await prisma.varianProdukAtribut.deleteMany({ where: { varianId: { in: varianIds } } });
    await prisma.varianProduk.deleteMany({ where: { id: { in: varianIds } } });
  }

  const atribut = await prisma.atributProduk.findMany({
    where: { produkId: existing.id },
    select: { id: true },
  });
  const atributIds = atribut.map((a) => a.id);

  if (atributIds.length) {
    await prisma.nilaiAtributProduk.deleteMany({ where: { atributId: { in: atributIds } } });
    await prisma.atributProduk.deleteMany({ where: { id: { in: atributIds } } });
  }

  await prisma.produk.delete({ where: { id: existing.id } });
  return true;
}

async function main() {
  console.log("🌱 Mulai seeding...");

  await seedAdmin();
  await seedKategori();
  await seedKurirDanLayanan();

  console.log("✅ Seed selesai (Admin + Kategori + Kurir/Layanan)");
}

main()
  .catch((e) => {
    console.error("❌ Gagal seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
