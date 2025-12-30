import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.product.upsert({
    where: { id: 1 },
    update: { name: "Smartphone Flagship", price: 15000000, stock: 10 },
    create: { id: 1, name: "Smartphone Flagship", price: 15000000, stock: 10 },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
