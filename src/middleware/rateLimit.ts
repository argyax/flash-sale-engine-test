import type { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis.js";
import { env } from "../env.js";
import { HttpError } from "../lib/errors.js";

export async function rateLimit(req: Request, _res: Response, next: NextFunction) {
  // bucket: per-IP per-second
  const ip = req.ip || "unknown";
  const nowSec = Math.floor(Date.now() / 1000);
  const key = `rl:${ip}:${nowSec}`;

  // INCR + EXPIRE (atomic enough for this case)
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 2);

  if (count > env.RATE_LIMIT_PER_SEC) {
    return next(new HttpError(429, "rate_limited", "Too many requests"));
  }

  next();
}
