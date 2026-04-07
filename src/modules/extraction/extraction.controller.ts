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
      const SIZE_THRESHOLD_BYTES = 100 * 1024;

      const isAsyncRequested =
        (req.query.mode as string) === ExtractionMode.ASYNC;
      const isFileTooLarge = file.sizeBytes > SIZE_THRESHOLD_BYTES;
      const mode =
        isAsyncRequested || isFileTooLarge
          ? ExtractionMode.ASYNC
          : ExtractionMode.SYNC;

      const intakeResult = await this.extractionService.intake(file, sessionId);

      if (intakeResult.isDuplicate) {
        const e = intakeResult.duplicateExtraction;
        res.setHeader("X-Deduplicated", "true");
        res.status(200).json({
          id: intakeResult.extractionId,
          sessionId: intakeResult.sessionId,
          fileName: e?.fileName,
          documentType: e?.documentType,
          documentName: e?.documentName,
          category: e?.category,
          applicableRole: e?.applicableRole,
          confidence: e?.confidence,
          holderName: e?.holderName,
          dateOfBirth: e?.dateOfBirth,
          sirbNumber: e?.sirbNumber,
          passportNumber: e?.passportNumber,
          isExpired: e?.isExpired,
          validity: {
            dateOfIssue: e?.issueDate,
            dateOfExpiry: e?.expiryDate,
            isExpired: e?.isExpired,
            daysUntilExpiry: e?.daysUntilExpiry,
            revalidationRequired: e?.revalidationRequired,
          },
          compliance: e?.complianceJson ? JSON.parse(e.complianceJson) : null,
          medicalData: e?.medicalJson ? JSON.parse(e.medicalJson) : null,
          fields: e?.fieldsJson ? JSON.parse(e.fieldsJson) : [],
          flags: e?.flagsJson ? JSON.parse(e.flagsJson) : [],
          summary: e?.summary,
          processingTimeMs: e?.processingTimeMs,
          createdAt: e?.createdAt,
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
