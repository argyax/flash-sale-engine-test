import { HttpError } from "../lib/errors.js";
export function errorHandler(err, _req, res, _next) {
    const status = err instanceof HttpError ? err.status : 500;
    const code = err instanceof HttpError ? err.code : "internal_error";
    const message = err?.message ?? code;
    res.status(status).json({ error: code, message, details: err?.details });
}
