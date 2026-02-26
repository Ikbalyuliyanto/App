import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const raw = JSON.parse(
    fs.readFileSync(
      "./data/IndoArea-19-04-2024/provinsi/provinsi.json",
      "utf-8"
    )
  );

  const data = Object.entries(raw).map(([id, nama]) => ({
    id,
    nama,
  }));

  console.log("Total provinsi:", data.length);

  await prisma.provinsi.createMany({
    data,
    skipDuplicates: true,
  });

  console.log("✅ Provinsi selesai");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });