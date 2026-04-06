import { Request, Response, NextFunction } from "express";
import { JobService } from "./job.service";
import { JobStatus } from "./job.types";

const AVG_PROCESSING_TIME_MS = 6000;

export class JobController {
  constructor(private readonly jobService: JobService) {}

  getJob = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const job = await this.jobService.getJob(req.params.jobId as string);

      if (job.status === JobStatus.QUEUED) {
        res.status(200).json({
          jobId: job.jobId,
          status: job.status,
          queuePosition: job.queuePosition,
          estimatedWaitMs: (job.queuePosition ?? 1) * AVG_PROCESSING_TIME_MS,
          queuedAt: job.queuedAt,
        });
        return;
      }

      if (job.status === JobStatus.PROCESSING) {
        res.status(200).json({
          jobId: job.jobId,
          status: job.status,
          startedAt: job.startedAt,
        });
        return;
      }

      if (job.status === JobStatus.FAILED) {
        res.status(200).json({
          jobId: job.jobId,
          status: job.status,
          error: job.errorCode,
          message: job.errorMessage,
          retryable: job.retryable,
          failedAt: job.completedAt,
        });
        return;
      }

      const e = job.extraction;

      res.status(200).json({
        jobId: job.jobId,
        status: job.status,
        extractionId: job.extractionId,
        result: e
          ? {
              id: e.id,
              sessionId: e.sessionId,
              fileName: e.fileName,
              documentType: e.documentType,
              documentName: e.documentName,
              category: e.category,
              applicableRole: e.applicableRole,
              confidence: e.confidence,
              holderName: e.holderName,
              dateOfBirth: e.dateOfBirth,
              sirbNumber: e.sirbNumber,
              passportNumber: e.passportNumber,
              isExpired: e.isExpired,
              validity: {
                dateOfIssue: e.issueDate,
                dateOfExpiry: e.expiryDate,
                isExpired: e.isExpired,
                daysUntilExpiry: e.daysUntilExpiry,
                revalidationRequired: e.revalidationRequired,
              },
              compliance: e.complianceJson
                ? JSON.parse(e.complianceJson as string)
                : null,
              medicalData: e.medicalJson
                ? JSON.parse(e.medicalJson as string)
                : null,
              fields: e.fieldsJson ? JSON.parse(e.fieldsJson as string) : [],
              flags: e.flagsJson ? JSON.parse(e.flagsJson as string) : [],
              summary: e.summary,
              processingTimeMs: e.processingTimeMs,
              createdAt: e.createdAt,
            }
          : null,
        completedAt: job.completedAt,
      });
    } catch (err) {
      next(err);
    }
  };
}
