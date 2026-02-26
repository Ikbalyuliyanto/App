import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const dir = "./data/IndoArea-19-04-2024/kabupaten_kota";
  const files = fs.readdirSync(dir);

  let data = [];

  for (const file of files) {
    // contoh: kabkot-11.json
    const provinsiId = file.match(/\d+/)[0];

    const raw = JSON.parse(
      fs.readFileSync(path.join(dir, file), "utf-8")
    );

    for (const [shortId, nama] of Object.entries(raw)) {
      // shortId = "01"
      const fullId = provinsiId + shortId; // jadi 1101

      data.push({
        id: fullId,
        nama,
        provinsiId,
      });
    }
  }

  console.log("Total kabupaten:", data.length);

  await prisma.kabupaten.createMany({
    data,
    skipDuplicates: true,
  });

  console.log("✅ Kabupaten selesai");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });