import "dotenv/config";
import { z } from "zod";
const schema = z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    RATE_LIMIT_PER_SEC: z.coerce.number().default(50),
    LOCK_TTL_MS: z.coerce.number().default(2000),
});
export const env = schema.parse(process.env);
