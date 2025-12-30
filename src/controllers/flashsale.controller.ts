import type { Request, Response, NextFunction } from "express";
import { buyFlashSale } from "../services/flashsale.service";

export async function buy(req: Request, res: Response, next: NextFunction) {
  try {
    const idem = String(req.header("X-Idempotency-Key") || "");
    const ip = req.ip || "unknown";
    const result = await buyFlashSale(req.body, idem, ip);
    res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}
