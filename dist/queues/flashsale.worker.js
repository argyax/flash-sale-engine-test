// src/queues/flashsale.worker.ts
import { Worker } from "bullmq";
import { redisConnection, redis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
function isPrismaUnique(e) {
    return e?.code === "P2002";
}
export const flashSaleWorker = new Worker("flash-sale", async (job) => {
    const { orderId, userId, productId, idempotencyKey } = job.data;
    // Jika idempotency sudah final sukses di Redis, tidak perlu proses lagi
    const idemKey = `idem:${idempotencyKey}`;
    const existing = await redis.get(idemKey);
    if (existing) {
        const parsed = JSON.parse(existing);
        if (parsed?.state === "success")
            return;
    }
    // DB adalah sumber kebenaran: lakukan transaksi atomik (kurangi stok DB + buat order)
    const result = await prisma.$transaction(async (tx) => {
        // 1) Kurangi stok DB secara atomik (mencegah oversell)
        const dec = await tx.product.updateMany({
            where: { id: productId, stock: { gt: 0 } },
            data: { stock: { decrement: 1 } },
        });
        if (dec.count !== 1) {
            return { ok: false, reason: "out_of_stock" };
        }
        // 2) Buat order (terkunci oleh unique: (userId,productId) dan idempotencyKey)
        try {
            await tx.order.create({
                data: { id: orderId, userId, productId, idempotencyKey },
            });
            return { ok: true };
        }
        catch (e) {
            if (isPrismaUnique(e)) {
                // Jika gagal karena unique, balikin stok DB (masih dalam transaksi)
                await tx.product.update({
                    where: { id: productId },
                    data: { stock: { increment: 1 } },
                });
                // Tentukan unique mana yang kena
                const targets = e?.meta?.target ?? [];
                if (targets.includes("idempotencyKey")) {
                    return { ok: false, reason: "idempotency_exists" };
                }
                return { ok: false, reason: "already_bought" };
            }
            throw e;
        }
    });
    // Sinkronisasi/kompensasi ke Redis
    const stockKey = `stock:product:${productId}`;
    const onceKey = `once:user:${productId}`;
    if (result.ok) {
        // Pastikan user tercatat sudah membeli (idempotent)
        await redis.sadd(onceKey, String(userId));
        // Simpan hasil final idempotency (TTL 24 jam)
        const body = { id: orderId, user_id: userId, product_id: productId };
        await redis.set(idemKey, JSON.stringify({ state: "success", body }), "EX", 60 * 60 * 24);
        return;
    }
    // Jika gagal di DB, revert Redis:
    // Catatan: endpoint sebelumnya sudah menurunkan stok Redis, jadi di sini harus dinaikkan kembali.
    await redis.incr(stockKey);
    await redis.srem(onceKey, String(userId));
    if (result.reason === "out_of_stock") {
        await redis.set(idemKey, JSON.stringify({ state: "failed", status: 400, error: "out_of_stock" }), "EX", 60 * 5);
    }
    else if (result.reason === "already_bought") {
        await redis.set(idemKey, JSON.stringify({
            state: "failed",
            status: 403,
            error: "already_bought",
        }), "EX", 60 * 30);
    }
    else if (result.reason === "idempotency_exists") {
        // Tidak perlu apa-apa; kasus ini idealnya sudah ditangani oleh idempotency di controller/service
        await redis.set(idemKey, JSON.stringify({ state: "success_cached" }), "EX", 60 * 60);
    }
}, { connection: redisConnection });
flashSaleWorker.on("failed", (job, err) => {
    console.error("flashSaleWorker gagal", job?.id, err);
});
