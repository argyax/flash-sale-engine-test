import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { rateLimit } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";
import { flashSaleRouter } from "./routes/flashsale.routes";
import { productsRouter } from "./routes/products.routes";
import { ordersRouter } from "./routes/orders.routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

//Rate Limiter
app.use(rateLimit);

app.get("/health", (_req, res) => res.json({ ok: "Mlebu lur" }));

app.use("/api/v1/flash-sale", flashSaleRouter);
app.use("/api/v1/products", productsRouter);
app.use("/api/v1/orders", ordersRouter);

app.use(errorHandler);
