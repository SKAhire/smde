import { Redis } from "ioredis";
import { env } from "../config/env";

export const redisConnection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});
