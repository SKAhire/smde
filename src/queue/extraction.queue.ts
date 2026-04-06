import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis";

export interface ExtractionJobPayload {
  extractionId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
}

export const extractionQueue = new Queue<ExtractionJobPayload>("extraction", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});
