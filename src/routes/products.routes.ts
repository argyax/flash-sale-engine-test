import { Router } from "express";
import { getOne } from "../controllers/products.controller";

export const productsRouter = Router();
productsRouter.get("/:id", getOne);
