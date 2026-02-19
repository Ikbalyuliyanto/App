-- DropForeignKey
ALTER TABLE "Ulasan" DROP CONSTRAINT "Ulasan_penggunaId_fkey";

-- DropForeignKey
ALTER TABLE "Ulasan" DROP CONSTRAINT "Ulasan_pesananId_fkey";

-- DropForeignKey
ALTER TABLE "Ulasan" DROP CONSTRAINT "Ulasan_produkId_fkey";

-- DropIndex
DROP INDEX "Ulasan_penggunaId_idx";

-- DropIndex
DROP INDEX "Ulasan_produkId_penggunaId_key";

-- AlterTable
ALTER TABLE "Ulasan" ADD COLUMN     "email" TEXT,
ADD COLUMN     "nama" TEXT,
ALTER COLUMN "penggunaId" DROP NOT NULL;
