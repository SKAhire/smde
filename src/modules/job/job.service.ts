import { JobRepository } from "./job.repository";
import { JobNotFoundError } from "../../middleware/error.middleware";
import { JobStatus, JobSummary } from "./job.types";

export class JobService {
  constructor(private readonly jobRepo: JobRepository) {}

  async getJob(jobId: string): Promise<JobSummary> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new JobNotFoundError(jobId);

    let queuePosition: number | null = null;
    if (job.status === JobStatus.QUEUED) {
      queuePosition = await this.jobRepo.countQueued();
    }

    return {
      jobId: job.id,
      status: job.status as JobStatus,
      sessionId: job.sessionId,
      extractionId: job.extractionId,
      extraction: job.extraction,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      retryable: job.retryable,
      queuePosition,
      queuedAt: job.queuedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }
}
