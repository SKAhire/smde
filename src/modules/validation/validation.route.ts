import { Router } from "express";
import { ValidationController } from "./validation.controller";
import { ValidationService } from "./validation.service";
import { ValidationRepository } from "./validation.repository";
import { SessionRepository } from "../session/session.repository";
import { extractRateLimiter } from "../../middleware/rate-limiter.middleware";
const router = Router({ mergeParams: true });

const validationRepository = new ValidationRepository();
const sessionRepository = new SessionRepository();
const validationService = new ValidationService(
  validationRepository,
  sessionRepository,
);
const validationController = new ValidationController(validationService);

router.post("/validate", extractRateLimiter, validationController.validate);
router.get("/report", validationController.getReport);

export default router;
