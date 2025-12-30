import { app } from "./app.js";
import { env } from "./env.js";
import { warmupStockToRedis } from "./scripts/warmupStock.js";
import "./queues/flashsale.worker.js";
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
