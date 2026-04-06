import { prisma } from "../../lib/prisma";
import { JobStatus } from "./job.types";

export class JobRepository {
  async create(data: {
    sessionId: string;
    extractionId: string;
    status: string;
  }) {
    return prisma.job.create({ data });
  }

  async findById(jobId: string) {
    return prisma.job.findUnique({
      where: { id: jobId },
      include: {
        extraction: true,
      },
    });
  }

  async updateStatus(
    jobId: string,
    data: Partial<{
      status: string;
      errorCode: string;
      errorMessage: string;
      retryable: boolean;
      startedAt: Date;
      completedAt: Date;
    }>,
  ) {
    return prisma.job.update({ where: { id: jobId }, data });
  }

  async countQueued(): Promise<number> {
    return prisma.job.count({ where: { status: JobStatus.QUEUED } });
  }
}
