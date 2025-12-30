import { Router } from "express";
import { buy } from "../controllers/flashsale.controller.js";
export const flashSaleRouter = Router();
flashSaleRouter.post("/buy", buy);
