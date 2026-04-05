import { Router } from "express";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";
import { SessionRepository } from "./session.repository";

const router = Router();

const sessionRepository = new SessionRepository();
const sessionService = new SessionService(sessionRepository);
const sessionController = new SessionController(sessionService);

router.post("/", sessionController.createSession);
router.get("/:sessionId", sessionController.getSessionSummary);

export default router;
