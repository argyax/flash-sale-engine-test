import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis.js";

export const flashSaleQueue = new Queue("flash-sale", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 5000,
    removeOnFail: 5000,
    attempts: 3,
    backoff: { type: "exponential", delay: 200 },
  },
});
