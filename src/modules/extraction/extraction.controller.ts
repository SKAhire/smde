import { Request, Response, NextFunction } from "express";
import { ExtractionService } from "./extraction.service";
import { IncomingFile } from "./extraction.types";

export class ExtractionController {
  constructor(private readonly extractionService: ExtractionService) {}

  extract = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "NO_FILE", message: "No file uploaded" });
        return;
      }

      const file: IncomingFile = {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        tempPath: req.file.path,
        sizeBytes: req.file.size,
      };

      const sessionId = req.body.sessionId as string | undefined;
      const result = await this.extractionService.intake(file, sessionId);

      if (result.isDuplicate) {
        res.setHeader("X-Deduplicated", "true");
        res.status(200).json({
          message: "Duplicate file detected. Returning existing extraction.",
          extractionId: result.extractionId,
          sessionId: result.sessionId,
        });
        return;
      }

      res.status(202).json({
        message: "File accepted. Processing will be implemented in next step.",
        extractionId: result.extractionId,
        sessionId: result.sessionId,
      });
    } catch (err) {
      next(err);
    }
  };
}
