import { prisma } from "../../lib/prisma";
import { CreateSessionResult } from "./session.types";

export class SessionRepository {
  async create(): Promise<CreateSessionResult> {
    return prisma.session.create({
      data: {},
      select: { id: true, createdAt: true },
    });
  }

  async findById(sessionId: string) {
    return prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        extractions: {
          orderBy: { createdAt: "asc" },
        },
        jobs: {
          where: { status: { in: ["QUEUED", "PROCESSING"] } },
          select: {
            id: true,
            status: true,
            extraction: { select: { fileName: true } },
          },
        },
      },
    });
  }

  async exists(sessionId: string): Promise<boolean> {
    const count = await prisma.session.count({ where: { id: sessionId } });
    return count > 0;
  }

  async updateDetectedRole(
    sessionId: string,
    detectedRole: string,
  ): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { detectedRole },
    });
  }
}
