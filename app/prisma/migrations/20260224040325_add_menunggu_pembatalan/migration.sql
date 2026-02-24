-- AlterEnum
ALTER TYPE "StatusPesanan" ADD VALUE 'MENUNGGU_PEMBATALAN';

-- AlterTable
ALTER TABLE "Pesanan" ADD COLUMN     "alasanBatal" TEXT,
ADD COLUMN     "keterangan" TEXT;
