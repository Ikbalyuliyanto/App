-- CreateEnum
CREATE TYPE "StatusPengembalian" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'BARANG_DIKIRIM_BALIK', 'SELESAI');

-- CreateEnum
CREATE TYPE "JenisPengembalian" AS ENUM ('REFUND', 'TUKAR');

-- AlterEnum
ALTER TYPE "StatusPesanan" ADD VALUE 'MENUNGGU_KONFIRMASI';

-- CreateTable
CREATE TABLE "Pengembalian" (
    "id" SERIAL NOT NULL,
    "pesananId" INTEGER NOT NULL,
    "penggunaId" INTEGER NOT NULL,
    "jenis" "JenisPengembalian" NOT NULL,
    "alasan" TEXT NOT NULL,
    "deskripsi" TEXT,
    "foto" TEXT[],
    "status" "StatusPengembalian" NOT NULL DEFAULT 'DIAJUKAN',
    "catatanAdmin" TEXT,
    "resiKembali" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengembalian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pengembalian_pesananId_key" ON "Pengembalian"("pesananId");

-- AddForeignKey
ALTER TABLE "Pengembalian" ADD CONSTRAINT "Pengembalian_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengembalian" ADD CONSTRAINT "Pengembalian_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
