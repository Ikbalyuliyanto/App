-- AlterEnum
ALTER TYPE "MetodePembayaran" ADD VALUE 'ONLINE';

-- AlterTable
ALTER TABLE "Pembayaran" ADD COLUMN     "snapToken" TEXT;
