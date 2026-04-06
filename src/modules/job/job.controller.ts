import { Request, Response, NextFunction } from "express";
import { JobService } from "./job.service";
import { JobStatus } from "./job.types";

export class JobController {
  constructor(private readonly jobService: JobService) {}

  getJob = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const job = await this.jobService.getJob(req.params.jobId as string);

      if (
        job.status === JobStatus.QUEUED ||
        job.status === JobStatus.PROCESSING
      ) {
        res.status(200).json({
          jobId: job.jobId,
          status: job.status,
          queuePosition: job.queuePosition,
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

      res.status(200).json({
        jobId: job.jobId,
        status: job.status,
        extractionId: job.extractionId,
        completedAt: job.completedAt,
      });
    } catch (err) {
      next(err);
    }
  };
}
