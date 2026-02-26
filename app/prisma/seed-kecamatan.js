import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const dir = "./data/IndoArea-19-04-2024/kecamatan";
  const files = fs.readdirSync(dir);

  let data = [];

  for (const file of files) {
    // kec-11-01.json
    const match = file.match(/kec-(\d+)-(\d+)\.json/);
    if (!match) continue;

    const prov = match[1]; // 11
    const kab = match[2];  // 01

    const raw = JSON.parse(
      fs.readFileSync(path.join(dir, file), "utf-8")
    );

    for (const [shortId, nama] of Object.entries(raw)) {
      const fullId = prov + kab + shortId; // 110101

      data.push({
        id: fullId,
        nama,
        kabupatenId: prov + kab, // 1101
      });
    }
  }

  console.log("Total kecamatan:", data.length);

  await prisma.kecamatan.createMany({
    data,
    skipDuplicates: true,
  });

  console.log("✅ Kecamatan selesai");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });