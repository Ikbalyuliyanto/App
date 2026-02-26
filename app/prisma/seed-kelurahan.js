import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const dir = "./data/IndoArea-19-04-2024/kelurahan_desa";
  const files = fs.readdirSync(dir);

  let data = [];

  for (const file of files) {
    const match = file.match(/keldesa-(\d+)-(\d+)-(\d+)\.json/);
    if (!match) continue;

    const prov = match[1];   // 11
    const kab = match[2];    // 04
    const kec = match[3];    // 010

    const kecamatanId = prov + kab + kec; // 1104010

    const raw = JSON.parse(
      fs.readFileSync(path.join(dir, file), "utf-8")
    );

    for (const [shortId, nama] of Object.entries(raw)) {
      const desa4 = shortId.padStart(4, "0"); // 0001

      const fullId = kecamatanId + desa4; // 11040100001

      data.push({
        id: fullId,
        nama,
        kecamatanId,
      });
    }
  }

  console.log("Total kelurahan:", data.length);

  await prisma.kelurahan.createMany({
    data,
    skipDuplicates: true,
  });

  console.log("✅ Kelurahan selesai");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });