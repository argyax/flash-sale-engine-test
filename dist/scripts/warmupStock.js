import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
export async function warmupStockToRedis() {
    const products = await prisma.product.findMany({ select: { id: true, stock: true } });
    for (const p of products) {
        await redis.set(`stock:product:${p.id}`, String(p.stock));
    }
}
