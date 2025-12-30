import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { HttpError } from "../lib/errors.js";

export async function getProductById(id: number) {
  const prod = await prisma.product.findUnique({ where: { id } });
  if (!prod) throw new HttpError(404, "not_found", "Product not found");

  const stockKey = `stock:product:${id}`;
  const stockStr = await redis.get(stockKey);
  const currentStock = stockStr != null ? Number(stockStr) : prod.stock;

  return {
    id: prod.id,
    name: prod.name,
    price: prod.price,
    current_stock: currentStock,
  };
}
