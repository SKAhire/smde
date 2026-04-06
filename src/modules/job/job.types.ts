export const JobStatus = {
  QUEUED: "QUEUED",
  PROCESSING: "PROCESSING",
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export interface JobSummary {
  jobId: string;
  status: JobStatus;
  sessionId: string;
  extractionId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean;
  queuePosition: number | null;
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}
