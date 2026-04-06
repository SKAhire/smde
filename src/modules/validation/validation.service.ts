import { ValidationRepository } from "./validation.repository";
import { SessionRepository } from "../session/session.repository";
import {
  ValidationResult,
  ValidationSummary,
  SessionReport,
  ReportDocument,
} from "./validation.types";
import {
  buildValidationPrompt,
  ExtractionSummaryInput,
} from "./validation.prompt";
import { createLLMProvider } from "../../llm/llm.factory";
import { parseExtractionResponse } from "../../utils/json.util";
import { parseFlagsJson } from "../session/session.types";
import {
  SessionNotFoundError,
  InsufficientDocumentsError,
} from "../../middleware/error.middleware";

export class ValidationService {
  constructor(
    private readonly validationRepo: ValidationRepository,
    private readonly sessionRepo: SessionRepository,
  ) {}

  async validateSession(sessionId: string): Promise<ValidationSummary> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);
    if (session.extractions.length < 2) throw new InsufficientDocumentsError();

    const extractionInputs: ExtractionSummaryInput[] = session.extractions.map(
      (e) => ({
        documentType: e.documentType,
        documentName: e.documentName,
        applicableRole: e.applicableRole,
        holderName: e.holderName,
        dateOfBirth: e.dateOfBirth,
        sirbNumber: e.sirbNumber,
        passportNumber: e.passportNumber,
        isExpired: e.isExpired,
        expiryDate: e.expiryDate,
        daysUntilExpiry: e.daysUntilExpiry,
        fitnessResult: e.fitnessResult,
        drugTestResult: e.drugTestResult,
        flags: parseFlagsJson(e.flagsJson),
        confidence: e.confidence,
      }),
    );

    const prompt = buildValidationPrompt(
      session.detectedRole,
      extractionInputs,
    );
    const provider = createLLMProvider();

    const rawResponse = await provider.extract(
      Buffer.from(prompt),
      "text/plain",
      "validation",
    );

    const result = parseExtractionResponse<ValidationResult>(rawResponse);

    const validation = await this.validationRepo.create({
      sessionId,
      overallStatus: result.overallStatus,
      overallScore: result.overallScore,
      holderProfileJson: JSON.stringify(result.holderProfile),
      consistencyChecksJson: JSON.stringify(result.consistencyChecks),
      missingDocumentsJson: JSON.stringify(result.missingDocuments),
      expiringDocumentsJson: JSON.stringify(result.expiringDocuments),
      medicalFlagsJson: JSON.stringify(result.medicalFlags),
      recommendationsJson: JSON.stringify(result.recommendations),
      summary: result.summary,
    });

    return {
      sessionId,
      holderProfile: result.holderProfile,
      consistencyChecks: result.consistencyChecks,
      missingDocuments: result.missingDocuments,
      expiringDocuments: result.expiringDocuments,
      medicalFlags: result.medicalFlags,
      overallStatus: result.overallStatus,
      overallScore: result.overallScore,
      summary: result.summary,
      recommendations: result.recommendations,
      validatedAt: validation.validatedAt,
    };
  }

  async getReport(sessionId: string): Promise<SessionReport> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);

    const latestValidation =
      await this.validationRepo.findLatestBySessionId(sessionId);

    const documentSummary: ReportDocument[] = session.extractions.map((e) => {
      const flags = parseFlagsJson(e.flagsJson);
      return {
        id: e.id,
        fileName: e.fileName,
        documentType: e.documentType,
        documentName: e.documentName,
        applicableRole: e.applicableRole,
        holderName: e.holderName,
        confidence: e.confidence,
        isExpired: e.isExpired,
        expiryDate: e.expiryDate,
        daysUntilExpiry: e.daysUntilExpiry,
        flagCount: flags.length,
        criticalFlagCount: flags.filter((f) => f.severity === "CRITICAL")
          .length,
        fitnessResult: e.fitnessResult,
        drugTestResult: e.drugTestResult,
        createdAt: e.createdAt,
      };
    });

    if (!latestValidation) {
      return {
        sessionId,
        generatedAt: new Date(),
        holderProfile: null,
        overallStatus: null,
        overallScore: null,
        documentSummary,
        complianceIssues: [],
        expiringDocuments: [],
        missingDocuments: [],
        medicalSummary: {
          fitnessResult: null,
          drugTestResult: null,
          medicalFlags: [],
        },
        recommendations: [],
        validatedAt: null,
      };
    }

    const holderProfile = JSON.parse(latestValidation.holderProfileJson);
    const consistencyChecks = JSON.parse(
      latestValidation.consistencyChecksJson,
    );
    const missingDocuments = JSON.parse(latestValidation.missingDocumentsJson);
    const expiringDocuments = JSON.parse(
      latestValidation.expiringDocumentsJson,
    );
    const medicalFlags = JSON.parse(latestValidation.medicalFlagsJson);
    const recommendations = JSON.parse(latestValidation.recommendationsJson);

    // Derive medical summary from extractions directly — more reliable than LLM output
    const fitnessResult =
      session.extractions.find(
        (e) => e.fitnessResult && e.fitnessResult !== "N/A",
      )?.fitnessResult ?? null;
    const drugTestResult =
      session.extractions.find(
        (e) => e.drugTestResult && e.drugTestResult !== "N/A",
      )?.drugTestResult ?? null;

    return {
      sessionId,
      generatedAt: new Date(),
      holderProfile,
      overallStatus: latestValidation.overallStatus,
      overallScore: latestValidation.overallScore,
      documentSummary,
      complianceIssues: consistencyChecks,
      expiringDocuments,
      missingDocuments,
      medicalSummary: {
        fitnessResult,
        drugTestResult,
        medicalFlags,
      },
      recommendations,
      validatedAt: latestValidation.validatedAt,
    };
  }
}
