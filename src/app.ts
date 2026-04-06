import express, { Application, Request, Response } from "express";
import { errorMiddleware } from "./middleware/error.middleware";
import { prisma } from "./lib/prisma";
import { redisConnection } from "./lib/redis";
import { env } from "./config/env";
import sessionRouter from "./modules/session/session.route";
import extractionRouter from "./modules/extraction/extraction.route";
import jobRouter from "./modules/job/job.route";
import validationRouter from "./modules/validation/validation.route";

const app: Application = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const startTime = Date.now();

app.get("/api/health", async (_req, res) => {
  const [dbPing, redisPing] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redisConnection.ping(),
  ]);

  const database = dbPing.status === "fulfilled" ? "OK" : "DEGRADED";
  const queue = redisPing.status === "fulfilled" ? "OK" : "DEGRADED";
  const overallStatus = database === "OK" && queue === "OK" ? "OK" : "DEGRADED";

  res.status(overallStatus === "OK" ? 200 : 503).json({
    status: overallStatus,
    version: "1.0.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    dependencies: {
      database,
      llmProvider: env.LLM_PROVIDER,
      queue,
    },
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/sessions", sessionRouter);
app.use("/api/sessions/:sessionId", validationRouter);
app.use("/api/extract", extractionRouter);
app.use("/api/jobs", jobRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
});

app.use(errorMiddleware);

export default app;
