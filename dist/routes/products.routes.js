import { Router } from "express";
import { getOne } from "../controllers/products.controller.js";
export const productsRouter = Router();
productsRouter.get("/:id", getOne);
