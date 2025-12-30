import { z } from "zod";
import { getProductById } from "../services/products.service.js";
import { HttpError } from "../lib/errors.js";
export async function getOne(req, res, next) {
    try {
        const id = z.coerce.number().int().positive().safeParse(req.params.id);
        if (!id.success)
            throw new HttpError(422, "validation_error", "Invalid product id");
        const data = await getProductById(id.data);
        res.json(data);
    }
    catch (e) {
        next(e);
    }
}
