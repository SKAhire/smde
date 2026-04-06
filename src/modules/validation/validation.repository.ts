import { prisma } from "../../lib/prisma";

export class ValidationRepository {
  async create(data: {
    sessionId: string;
    overallStatus: string;
    overallScore: number;
    holderProfileJson: string;
    consistencyChecksJson: string;
    missingDocumentsJson: string;
    expiringDocumentsJson: string;
    medicalFlagsJson: string;
    recommendationsJson: string;
    summary: string;
  }) {
    return prisma.validation.create({ data });
  }

  async findLatestBySessionId(sessionId: string) {
    return prisma.validation.findFirst({
      where: { sessionId },
      orderBy: { validatedAt: "desc" },
    });
  }
}
