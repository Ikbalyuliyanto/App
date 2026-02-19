-- CreateTable
CREATE TABLE "Ulasan" (
    "id" SERIAL NOT NULL,
    "produkId" INTEGER NOT NULL,
    "penggunaId" INTEGER NOT NULL,
    "pesananId" INTEGER,
    "rating" INTEGER NOT NULL,
    "komentar" TEXT,
    "foto" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ulasan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ulasan_produkId_idx" ON "Ulasan"("produkId");

-- CreateIndex
CREATE INDEX "Ulasan_penggunaId_idx" ON "Ulasan"("penggunaId");

-- CreateIndex
CREATE UNIQUE INDEX "Ulasan_produkId_penggunaId_key" ON "Ulasan"("produkId", "penggunaId");

-- AddForeignKey
ALTER TABLE "Ulasan" ADD CONSTRAINT "Ulasan_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ulasan" ADD CONSTRAINT "Ulasan_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ulasan" ADD CONSTRAINT "Ulasan_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
