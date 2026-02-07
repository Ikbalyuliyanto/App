-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "StatusPesanan" AS ENUM ('MENUNGGU_PEMBAYARAN', 'DIPROSES', 'DIKIRIM', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusPembayaran" AS ENUM ('MENUNGGU', 'BERHASIL', 'GAGAL', 'KADALUARSA', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "MetodePembayaran" AS ENUM ('VA', 'EWALLET', 'COD');

-- CreateTable
CREATE TABLE "Pengguna" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "peran" "Peran" NOT NULL DEFAULT 'USER',
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilPengguna" (
    "id" SERIAL NOT NULL,
    "penggunaId" INTEGER NOT NULL,
    "namaDepan" TEXT NOT NULL,
    "namaBelakang" TEXT NOT NULL,
    "nomorTelepon" TEXT NOT NULL,
    "jenisKelamin" "JenisKelamin" NOT NULL,
    "newsletter" BOOLEAN NOT NULL DEFAULT false,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfilPengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlamatPengguna" (
    "id" SERIAL NOT NULL,
    "penggunaId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "namaPenerima" TEXT NOT NULL,
    "noTelp" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL,
    "kota" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "kelurahan" TEXT NOT NULL,
    "kodePos" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "mapsUrl" TEXT,
    "isUtama" BOOLEAN NOT NULL DEFAULT false,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlamatPengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kategori" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "logo" TEXT,
    "header" BOOLEAN NOT NULL DEFAULT false,
    "body" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produk" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "urlproduk" TEXT,
    "merek" TEXT,
    "harga" INTEGER NOT NULL,
    "hargaAsli" INTEGER,
    "diskonPersen" INTEGER,
    "gratisOngkir" BOOLEAN NOT NULL DEFAULT false,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "flashsale" BOOLEAN NOT NULL DEFAULT false,
    "terlaris" BOOLEAN NOT NULL DEFAULT false,
    "untukmu" BOOLEAN NOT NULL DEFAULT false,
    "ratingRata" DOUBLE PRECISION,
    "jumlahRating" INTEGER NOT NULL DEFAULT 0,
    "terjual" INTEGER NOT NULL DEFAULT 0,
    "stokProduk" INTEGER NOT NULL DEFAULT 0,
    "gambarUtama" TEXT,
    "kategoriId" INTEGER NOT NULL,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdukGambar" (
    "id" SERIAL NOT NULL,
    "produkId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "alt" TEXT,

    CONSTRAINT "ProdukGambar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtributProduk" (
    "id" SERIAL NOT NULL,
    "produkId" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AtributProduk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NilaiAtributProduk" (
    "id" SERIAL NOT NULL,
    "atributId" INTEGER NOT NULL,
    "nilai" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NilaiAtributProduk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarianProduk" (
    "id" SERIAL NOT NULL,
    "produkId" INTEGER NOT NULL,
    "sku" TEXT,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "harga" INTEGER,

    CONSTRAINT "VarianProduk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarianProdukAtribut" (
    "id" SERIAL NOT NULL,
    "varianId" INTEGER NOT NULL,
    "nilaiId" INTEGER NOT NULL,

    CONSTRAINT "VarianProdukAtribut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keranjang" (
    "id" SERIAL NOT NULL,
    "penggunaId" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keranjang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemKeranjang" (
    "id" SERIAL NOT NULL,
    "keranjangId" INTEGER NOT NULL,
    "produkId" INTEGER NOT NULL,
    "varianId" INTEGER,
    "jumlah" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ItemKeranjang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kurir" (
    "id" SERIAL NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "logo" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kurir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayananPengiriman" (
    "id" SERIAL NOT NULL,
    "kurirId" INTEGER NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "estimasiHari" TEXT NOT NULL,
    "harga" INTEGER NOT NULL,
    "gratis" BOOLEAN NOT NULL DEFAULT false,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LayananPengiriman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pesanan" (
    "id" SERIAL NOT NULL,
    "penggunaId" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "ongkir" INTEGER NOT NULL DEFAULT 0,
    "diskon" INTEGER NOT NULL DEFAULT 0,
    "totalAkhir" INTEGER NOT NULL,
    "status" "StatusPesanan" NOT NULL DEFAULT 'MENUNGGU_PEMBAYARAN',
    "namaPenerima" TEXT NOT NULL,
    "noTelp" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "kelurahan" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "kota" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL,
    "kodePos" TEXT NOT NULL,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pesanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPesanan" (
    "id" SERIAL NOT NULL,
    "pesananId" INTEGER NOT NULL,
    "produkId" INTEGER NOT NULL,
    "varianId" INTEGER,
    "jumlah" INTEGER NOT NULL,
    "harga" INTEGER NOT NULL,

    CONSTRAINT "ItemPesanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengiriman" (
    "id" SERIAL NOT NULL,
    "pesananId" INTEGER NOT NULL,
    "layananId" INTEGER NOT NULL,
    "biaya" INTEGER NOT NULL,
    "resi" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengiriman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pembayaran" (
    "id" SERIAL NOT NULL,
    "pesananId" INTEGER NOT NULL,
    "metode" "MetodePembayaran" NOT NULL,
    "provider" TEXT,
    "status" "StatusPembayaran" NOT NULL DEFAULT 'MENUNGGU',
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "vaNumber" TEXT,
    "refId" TEXT,
    "expiredAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rawResponse" JSONB,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pengguna_email_key" ON "Pengguna"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProfilPengguna_penggunaId_key" ON "ProfilPengguna"("penggunaId");

-- CreateIndex
CREATE INDEX "AlamatPengguna_penggunaId_idx" ON "AlamatPengguna"("penggunaId");

-- CreateIndex
CREATE UNIQUE INDEX "Kategori_nama_key" ON "Kategori"("nama");

-- CreateIndex
CREATE INDEX "Produk_kategoriId_idx" ON "Produk"("kategoriId");

-- CreateIndex
CREATE INDEX "ProdukGambar_produkId_idx" ON "ProdukGambar"("produkId");

-- CreateIndex
CREATE INDEX "AtributProduk_produkId_idx" ON "AtributProduk"("produkId");

-- CreateIndex
CREATE UNIQUE INDEX "AtributProduk_produkId_nama_key" ON "AtributProduk"("produkId", "nama");

-- CreateIndex
CREATE INDEX "NilaiAtributProduk_atributId_idx" ON "NilaiAtributProduk"("atributId");

-- CreateIndex
CREATE UNIQUE INDEX "NilaiAtributProduk_atributId_nilai_key" ON "NilaiAtributProduk"("atributId", "nilai");

-- CreateIndex
CREATE UNIQUE INDEX "VarianProduk_sku_key" ON "VarianProduk"("sku");

-- CreateIndex
CREATE INDEX "VarianProduk_produkId_idx" ON "VarianProduk"("produkId");

-- CreateIndex
CREATE INDEX "VarianProdukAtribut_varianId_idx" ON "VarianProdukAtribut"("varianId");

-- CreateIndex
CREATE INDEX "VarianProdukAtribut_nilaiId_idx" ON "VarianProdukAtribut"("nilaiId");

-- CreateIndex
CREATE UNIQUE INDEX "VarianProdukAtribut_varianId_nilaiId_key" ON "VarianProdukAtribut"("varianId", "nilaiId");

-- CreateIndex
CREATE INDEX "Keranjang_penggunaId_idx" ON "Keranjang"("penggunaId");

-- CreateIndex
CREATE INDEX "ItemKeranjang_keranjangId_idx" ON "ItemKeranjang"("keranjangId");

-- CreateIndex
CREATE INDEX "ItemKeranjang_produkId_idx" ON "ItemKeranjang"("produkId");

-- CreateIndex
CREATE INDEX "ItemKeranjang_varianId_idx" ON "ItemKeranjang"("varianId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemKeranjang_keranjangId_produkId_varianId_key" ON "ItemKeranjang"("keranjangId", "produkId", "varianId");

-- CreateIndex
CREATE UNIQUE INDEX "Kurir_kode_key" ON "Kurir"("kode");

-- CreateIndex
CREATE INDEX "LayananPengiriman_kurirId_idx" ON "LayananPengiriman"("kurirId");

-- CreateIndex
CREATE UNIQUE INDEX "LayananPengiriman_kurirId_kode_key" ON "LayananPengiriman"("kurirId", "kode");

-- CreateIndex
CREATE INDEX "Pesanan_penggunaId_idx" ON "Pesanan"("penggunaId");

-- CreateIndex
CREATE INDEX "Pesanan_status_idx" ON "Pesanan"("status");

-- CreateIndex
CREATE INDEX "ItemPesanan_pesananId_idx" ON "ItemPesanan"("pesananId");

-- CreateIndex
CREATE INDEX "ItemPesanan_produkId_idx" ON "ItemPesanan"("produkId");

-- CreateIndex
CREATE INDEX "ItemPesanan_varianId_idx" ON "ItemPesanan"("varianId");

-- CreateIndex
CREATE UNIQUE INDEX "Pengiriman_pesananId_key" ON "Pengiriman"("pesananId");

-- CreateIndex
CREATE INDEX "Pengiriman_layananId_idx" ON "Pengiriman"("layananId");

-- CreateIndex
CREATE UNIQUE INDEX "Pembayaran_pesananId_key" ON "Pembayaran"("pesananId");

-- CreateIndex
CREATE UNIQUE INDEX "Pembayaran_refId_key" ON "Pembayaran"("refId");

-- CreateIndex
CREATE INDEX "Pembayaran_status_idx" ON "Pembayaran"("status");

-- CreateIndex
CREATE INDEX "Pembayaran_metode_idx" ON "Pembayaran"("metode");

-- CreateIndex
CREATE INDEX "Pembayaran_provider_idx" ON "Pembayaran"("provider");

-- AddForeignKey
ALTER TABLE "ProfilPengguna" ADD CONSTRAINT "ProfilPengguna_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlamatPengguna" ADD CONSTRAINT "AlamatPengguna_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produk" ADD CONSTRAINT "Produk_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdukGambar" ADD CONSTRAINT "ProdukGambar_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtributProduk" ADD CONSTRAINT "AtributProduk_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NilaiAtributProduk" ADD CONSTRAINT "NilaiAtributProduk_atributId_fkey" FOREIGN KEY ("atributId") REFERENCES "AtributProduk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianProduk" ADD CONSTRAINT "VarianProduk_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianProdukAtribut" ADD CONSTRAINT "VarianProdukAtribut_varianId_fkey" FOREIGN KEY ("varianId") REFERENCES "VarianProduk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianProdukAtribut" ADD CONSTRAINT "VarianProdukAtribut_nilaiId_fkey" FOREIGN KEY ("nilaiId") REFERENCES "NilaiAtributProduk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keranjang" ADD CONSTRAINT "Keranjang_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemKeranjang" ADD CONSTRAINT "ItemKeranjang_keranjangId_fkey" FOREIGN KEY ("keranjangId") REFERENCES "Keranjang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemKeranjang" ADD CONSTRAINT "ItemKeranjang_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemKeranjang" ADD CONSTRAINT "ItemKeranjang_varianId_fkey" FOREIGN KEY ("varianId") REFERENCES "VarianProduk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayananPengiriman" ADD CONSTRAINT "LayananPengiriman_kurirId_fkey" FOREIGN KEY ("kurirId") REFERENCES "Kurir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pesanan" ADD CONSTRAINT "Pesanan_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPesanan" ADD CONSTRAINT "ItemPesanan_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPesanan" ADD CONSTRAINT "ItemPesanan_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPesanan" ADD CONSTRAINT "ItemPesanan_varianId_fkey" FOREIGN KEY ("varianId") REFERENCES "VarianProduk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengiriman" ADD CONSTRAINT "Pengiriman_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengiriman" ADD CONSTRAINT "Pengiriman_layananId_fkey" FOREIGN KEY ("layananId") REFERENCES "LayananPengiriman"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pembayaran" ADD CONSTRAINT "Pembayaran_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
