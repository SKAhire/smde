import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { ErrorCode } from "./error.middleware";

export const extractRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (_req: Request, res: Response) => {
    const retryAfterMs = 60 * 1000;
    res.setHeader("Retry-After", 60);
    res.status(429).json({
      error: ErrorCode.RATE_LIMITED,
      message: "Too many requests. Please slow down.",
      retryAfterMs,
    });
  },
});
