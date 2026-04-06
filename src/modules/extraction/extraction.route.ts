import { Router } from "express";
import { ExtractionController } from "./extraction.controller";
import { ExtractionService } from "./extraction.service";
import { ExtractionRepository } from "./extraction.repository";
import { SessionRepository } from "../session/session.repository";
import { JobRepository } from "../job/job.repository";
import { upload } from "../../middleware/upload.middleware";
import { extractRateLimiter } from "../../middleware/rate-limiter.middleware";

const router = Router();

const extractionRepository = new ExtractionRepository();
const sessionRepository = new SessionRepository();
const jobRepository = new JobRepository();
const extractionService = new ExtractionService(
  extractionRepository,
  sessionRepository,
  jobRepository,
);
const extractionController = new ExtractionController(extractionService);

router.post(
  "/",
  extractRateLimiter,
  upload.single("document"),
  extractionController.extract,
);

export default router;
