import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { getProductById } from "../services/products.service";
import { HttpError } from "../lib/errors";

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().safeParse(req.params.id);
    if (!id.success) throw new HttpError(422, "validation_error", "Invalid product id");

    const data = await getProductById(id.data);
    res.json(data);
  } catch (e) {
    next(e);
  }
}
