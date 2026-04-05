import express, { Application, Request, Response } from "express";
import { errorMiddleware } from "./middleware/error.middleware";
import sessionRouter from "./modules/session/session.route";
import extractionRouter from "./modules/extraction/extraction.route";
import { prisma } from "./lib/prisma";

const app: Application = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const startTime = Date.now();

app.get("/api/health", async (_req, res) => {
  const dbPing = await prisma.$queryRaw`SELECT 1`
    .then(() => "OK")
    .catch(() => "DEGRADED");

  const overallStatus = dbPing === "OK" ? "OK" : "DEGRADED";

  res.status(overallStatus === "OK" ? 200 : 503).json({
    status: overallStatus,
    version: "1.0.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    dependencies: {
      database: dbPing,
      llmProvider: "not_configured",
      queue: "not_configured",
    },
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/sessions", sessionRouter);
app.use("/api/extract", extractionRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Route not found",
  });
});

app.use(errorMiddleware);

export default app;
