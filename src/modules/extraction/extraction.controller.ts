import { Request, Response, NextFunction } from "express";
import { ExtractionService } from "./extraction.service";
import { ExtractionMode, IncomingFile } from "./extraction.types";

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
      const SIZE_THRESHOLD_BYTES = 100 * 1024; // 100KB

      const isAsyncRequested =
        (req.query.mode as string) === ExtractionMode.ASYNC;
      const isFileTooLarge = file.sizeBytes > SIZE_THRESHOLD_BYTES;

      const mode =
        isAsyncRequested || isFileTooLarge
          ? ExtractionMode.ASYNC
          : ExtractionMode.SYNC;

      const intakeResult = await this.extractionService.intake(file, sessionId);

      if (intakeResult.isDuplicate) {
        res.setHeader("X-Deduplicated", "true");
        res.status(200).json({
          extractionId: intakeResult.extractionId,
          sessionId: intakeResult.sessionId,
        });
        return;
      }

      if (mode === ExtractionMode.ASYNC) {
        const jobId = await this.extractionService.enqueueAsync(
          intakeResult.extractionId!,
          intakeResult.sessionId,
          file,
        );

        res.status(202).json({
          jobId,
          sessionId: intakeResult.sessionId,
          status: "QUEUED",
          pollUrl: `/api/jobs/${jobId}`,
        });
        return;
      }

      const result = await this.extractionService.processSync(
        intakeResult.extractionId!,
        file,
      );

      res.status(200).json({
        id: intakeResult.extractionId,
        sessionId: intakeResult.sessionId,
        fileName: file.originalName,
        ...result.detection,
        holder: result.holder,
        fields: result.fields,
        validity: result.validity,
        compliance: result.compliance,
        medicalData: result.medicalData,
        flags: result.flags,
        summary: result.summary,
      });
    } catch (err) {
      next(err);
    }
  };
}
