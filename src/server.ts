import { app } from "./app";
import { env } from "./env";
import { warmupStockToRedis } from "./scripts/warmupStock";
import "./queues/flashsale.worker";

async function main() {
  await warmupStockToRedis();

  app.listen(env.PORT, () => {
    console.log(`API listening on :${env.PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
