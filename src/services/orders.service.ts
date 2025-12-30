import { prisma } from "../lib/prisma";

export async function listOrders(productId?: number) {
  const orders = await prisma.order.findMany({
    where: productId ? { productId } : undefined,
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true, productId: true, createdAt: true },
  });

  return orders.map((o) => ({
    id: o.id,
    user_id: o.userId,
    product_id: o.productId,
    created_at: o.createdAt.toISOString(),
  }));
}
