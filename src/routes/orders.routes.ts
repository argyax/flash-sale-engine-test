import { Router } from "express";
import { list } from "../controllers/orders.controller";

export const ordersRouter = Router();
ordersRouter.get("/", list);
