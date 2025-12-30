import { Router } from "express";
import { list } from "../controllers/orders.controller.js";
export const ordersRouter = Router();
ordersRouter.get("/", list);
