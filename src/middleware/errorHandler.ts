import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../lib/errors";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof HttpError ? err.status : 500;
  const code = err instanceof HttpError ? err.code : "internal_error";
  const message = err?.message ?? code;

  res.status(status).json({ error: code, message, details: err?.details });
}
