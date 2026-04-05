import { prisma } from "../../lib/prisma";

export class ExtractionRepository {
  async findByHashAndSession(fileHash: string, sessionId: string) {
    return prisma.extraction.findFirst({
      where: { fileHash, sessionId },
    });
  }

  async create(data: {
    sessionId: string;
    fileName: string;
    fileHash: string;
    mimeType: string;
    status: string;
  }) {
    return prisma.extraction.create({ data });
  }

  async findById(id: string) {
    return prisma.extraction.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: Partial<{
      documentType: string;
      documentName: string;
      category: string;
      applicableRole: string;
      confidence: string;
      status: string;
      holderName: string;
      dateOfBirth: string;
      sirbNumber: string;
      passportNumber: string;
      holderRank: string;
      holderNationality: string;
      holderPhoto: string;
      issueDate: string;
      expiryDate: string;
      isExpired: boolean;
      daysUntilExpiry: number;
      revalidationRequired: boolean;
      issuingAuthority: string;
      regulationReference: string;
      imoModelCourse: string;
      fitnessResult: string;
      drugTestResult: string;
      fieldsJson: string;
      complianceJson: string;
      medicalJson: string;
      flagsJson: string;
      rawLlmResponse: string;
      promptVersion: string;
      processingTimeMs: number;
      summary: string;
    }>,
  ) {
    return prisma.extraction.update({ where: { id }, data });
  }
}
