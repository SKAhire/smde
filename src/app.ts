import express, { Application, Request, Response } from "express";
import { errorMiddleware } from "./middleware/error.middleware";

const app: Application = express();


// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const startTime = Date.now();

app.get("/api/health", async (_req, res) => {
  const dependencies = {
    database: "OK",
    llmProvider: "OK",
    queue: "OK",
  };

  const uptime = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    status: "OK",
    version: "1.0.0",
    uptime,
    dependencies,
    timestamp: new Date().toISOString(),
  });
});


app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorMiddleware);
export default app;
