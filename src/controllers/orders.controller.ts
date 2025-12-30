import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { listOrders } from "../services/orders.service";
import { HttpError } from "../lib/errors";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const qp = z.object({ product_id: z.coerce.number().int().positive().optional() }).safeParse(req.query);
    if (!qp.success) throw new HttpError(422, "validation_error", "Invalid query params");

    const data = await listOrders(qp.data.product_id);
    res.json(data);
  } catch (e) {
    next(e);
  }
}
