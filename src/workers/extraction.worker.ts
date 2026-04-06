import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis";
import { ExtractionService } from "../modules/extraction/extraction.service";
import { ExtractionRepository } from "../modules/extraction/extraction.repository";
import { SessionRepository } from "../modules/session/session.repository";
import { JobRepository } from "../modules/job/job.repository";
import { ExtractionJobPayload } from "../queue/extraction.queue";
import { JobStatus } from "../modules/job/job.types";
import { ErrorCode } from "../middleware/error.middleware";

const extractionRepo = new ExtractionRepository();
const sessionRepo = new SessionRepository();
const jobRepo = new JobRepository();
const extractionService = new ExtractionService(
  extractionRepo,
  sessionRepo,
  jobRepo,
);

export const extractionWorker = new Worker<ExtractionJobPayload>(
  "extraction",
  async (bullJob) => {
    const { extractionId, filePath, fileName, mimeType } = bullJob.data;

    const dbJob = await jobRepo.findById(bullJob.id ?? "");
    if (!dbJob) return;

    await jobRepo.updateStatus(dbJob.id, {
      status: JobStatus.PROCESSING,
      startedAt: new Date(),
    });

    try {
      await extractionService.processSync(extractionId, {
        originalName: fileName,
        mimeType,
        tempPath: filePath,
        sizeBytes: 0,
      });

      await jobRepo.updateStatus(dbJob.id, {
        status: JobStatus.COMPLETE,
        completedAt: new Date(),
      });
    } catch {
      await jobRepo.updateStatus(dbJob.id, {
        status: JobStatus.FAILED,
        errorCode: ErrorCode.LLM_JSON_PARSE_FAIL,
        errorMessage: "Extraction failed during async processing.",
        retryable: true,
        completedAt: new Date(),
      });
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  },
);

extractionWorker.on("failed", (job, err) => {
  console.error(`Worker job ${job?.id} failed:`, err.message);
});
