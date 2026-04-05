import { Request, Response, NextFunction } from "express";
import { SessionService } from "./session.service";

export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  createSession = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const session = await this.sessionService.createSession();
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  };

  getSessionSummary = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const summary = await this.sessionService.getSessionSummary(
        req.params.sessionId as string,
      );
      res.json(summary);
    } catch (err) {
      next(err);
    }
  };
}
