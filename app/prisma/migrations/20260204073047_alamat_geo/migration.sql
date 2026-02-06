-- DropForeignKey
ALTER TABLE "AlamatPengguna" DROP CONSTRAINT "AlamatPengguna_penggunaId_fkey";

-- AlterTable
ALTER TABLE "AlamatPengguna" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "mapsUrl" TEXT;

-- AddForeignKey
ALTER TABLE "AlamatPengguna" ADD CONSTRAINT "AlamatPengguna_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE CASCADE ON UPDATE CASCADE;
