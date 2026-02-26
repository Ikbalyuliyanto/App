-- CreateTable
CREATE TABLE "Provinsi" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "Provinsi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kabupaten" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "provinsiId" TEXT NOT NULL,

    CONSTRAINT "Kabupaten_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kecamatan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kabupatenId" TEXT NOT NULL,

    CONSTRAINT "Kecamatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kelurahan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kecamatanId" TEXT NOT NULL,

    CONSTRAINT "Kelurahan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Kabupaten_provinsiId_idx" ON "Kabupaten"("provinsiId");

-- CreateIndex
CREATE INDEX "Kecamatan_kabupatenId_idx" ON "Kecamatan"("kabupatenId");

-- CreateIndex
CREATE INDEX "Kelurahan_kecamatanId_idx" ON "Kelurahan"("kecamatanId");

-- AddForeignKey
ALTER TABLE "Kabupaten" ADD CONSTRAINT "Kabupaten_provinsiId_fkey" FOREIGN KEY ("provinsiId") REFERENCES "Provinsi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kecamatan" ADD CONSTRAINT "Kecamatan_kabupatenId_fkey" FOREIGN KEY ("kabupatenId") REFERENCES "Kabupaten"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelurahan" ADD CONSTRAINT "Kelurahan_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES "Kecamatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
