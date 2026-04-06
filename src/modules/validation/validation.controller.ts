import { Request, Response, NextFunction } from "express";
import { ValidationService } from "./validation.service";

export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  validate = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.validationService.validateSession(
        req.params.sessionId as string,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const report = await this.validationService.getReport(
        req.params.sessionId as string,
      );
      res.status(200).json(report);
    } catch (err) {
      next(err);
    }
  };
}
