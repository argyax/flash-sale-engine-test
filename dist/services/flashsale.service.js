// src/services/flashsale.service.ts
import { z } from "zod";
import { redis } from "../lib/redis.js";
import { HttpError } from "../lib/errors.js";
import { env } from "../env.js";
import { flashSaleQueue } from "../queues/flashsale.queue.js";
import crypto from "crypto";
export const buySchema = z.object({
    product_id: z.number().int().positive(),
    user_id: z.number().int().positive(),
});
const LUA_DECR_STOCK = `
local key = KEYS[1]
local current = tonumber(redis.call("GET", key) or "-1")
if current <= 0 then
  return -1
end
local nextv = current - 1
redis.call("SET", key, tostring(nextv))
return nextv
`;
export async function buyFlashSale(payload, idempotencyKey, ip) {
    const parsed = buySchema.safeParse(payload);
    if (!parsed.success) {
        throw new HttpError(422, "validation_error", "Body tidak valid", parsed.error.flatten());
    }
    if (!idempotencyKey || idempotencyKey.trim().length < 8) {
        throw new HttpError(422, "validation_error", "Header X-Idempotency-Key wajib diisi");
    }
    const { product_id: productId, user_id: userId } = parsed.data;
    // 1) Cek idempotency (kalau request dengan key yang sama sudah pernah sukses, balikin hasil yang sama)
    const idemKey = `idem:${idempotencyKey}`;
    const idemExisting = await redis.get(idemKey);
    if (idemExisting) {
        const v = JSON.parse(idemExisting);
        if (v?.state === "success") {
            // Requirement: 200 OK jika key yang sama sudah sukses sebelumnya
            return { status: 200, body: v.body };
        }
        // Kalau masih pending/failed, block request duplikat supaya tidak hammer sistem
        throw new HttpError(429, "idempotency_in_progress", "Request dengan idempotency key yang sama masih diproses");
    }
    // 2) Pembatasan ringan per-user per-detik (opsional) untuk mengurangi spam
    const nowSec = Math.floor(Date.now() / 1000);
    const userRlKey = `rl:user:${userId}:${nowSec}`;
    const userCount = await redis.incr(userRlKey);
    if (userCount === 1)
        await redis.expire(userRlKey, 2);
    if (userCount > Math.max(3, Math.floor(env.RATE_LIMIT_PER_SEC / 10))) {
        throw new HttpError(429, "rate_limited", "Terlalu banyak request (user)");
    }
    // 3) Distributed lock per user+produk (mencegah double click paralel / request bersamaan)
    const lockKey = `lock:user:${productId}:${userId}`;
    const lockOk = await redis.set(lockKey, "1", "PX", env.LOCK_TTL_MS, "NX");
    if (!lockOk) {
        throw new HttpError(429, "locked", "Sibuk (gagal mengambil lock)");
    }
    const stockKey = `stock:product:${productId}`;
    const onceKey = `once:user:${productId}`;
    try {
        // 4) Batasi 1 user maksimal 1 unit per produk (cek cepat via Redis Set)
        const already = await redis.sismember(onceKey, String(userId));
        if (already) {
            throw new HttpError(403, "already_bought", "User sudah pernah membeli produk ini");
        }
        // Tandai lebih awal agar user tidak bisa spam sequential (akan direvert jika gagal)
        await redis.sadd(onceKey, String(userId));
        // 5) Kurangi stok secara atomik di Redis pakai Lua (menghindari race condition)
        const remaining = (await redis.eval(LUA_DECR_STOCK, 1, stockKey));
        if (remaining < 0) {
            // Revert penandaan user karena stok habis
            await redis.srem(onceKey, String(userId));
            throw new HttpError(400, "out_of_stock", "Stok habis");
        }
        // 6) Simpan idempotency sebagai pending (TTL 5 menit) supaya request sama tidak diproses ulang
        const orderId = crypto.randomUUID();
        await redis.set(idemKey, JSON.stringify({
            state: "pending",
            order_id: orderId,
            user_id: userId,
            product_id: productId,
            ip,
        }), "EX", 60 * 5);
        // 7) Masukkan job ke queue untuk proses final di DB (DB adalah sumber kebenaran)
        await flashSaleQueue.add("buy", {
            orderId,
            userId,
            productId,
            idempotencyKey,
        });
        return {
            status: 201,
            body: {
                id: orderId,
                user_id: userId,
                product_id: productId,
                remaining_stock_hint: remaining,
            },
        };
    }
    finally {
        // Lepas lock (agar request berikutnya bisa masuk)
        await redis.del(lockKey);
    }
}
