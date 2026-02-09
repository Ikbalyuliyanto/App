// prisma/seed.js (atau seed.ts)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@zawawiya.com";
  const plain = "admin123";
  const hash = await bcrypt.hash(plain, 10);

  await prisma.pengguna.upsert({
    where: { email: adminEmail },
    update: {
      password: hash,
      peran: "ADMIN",
    },
    create: {
      email: adminEmail,
      password: hash,
      peran: "ADMIN",
    },
  });

  console.log("✅ Seed admin done");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
