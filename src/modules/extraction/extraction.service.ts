import fs from "fs";
import { ExtractionRepository } from "./extraction.repository";
import { SessionRepository } from "../session/session.repository";
import { JobRepository } from "../job/job.repository";
import { IncomingFile, ExtractionStatus } from "./extraction.types";
import {
  SessionNotFoundError,
  UnsupportedFormatError,
  LLMParseError,
} from "../../middleware/error.middleware";
import { hashFile, deleteTempFile } from "../../utils/hash.util";
import { validateMimeType } from "../../utils/mime.util";
import { createLLMProvider } from "../../llm/llm.factory";
import { parseExtractionResponse } from "../../utils/json.util";
import { LLMExtractionResult } from "../../llm/llm.types";
import { extractionQueue } from "../../queue/extraction.queue";
import { env } from "../../config/env";

export class ExtractionService {
  constructor(
    private readonly extractionRepo: ExtractionRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly jobRepo: JobRepository,
  ) {}

  async intake(
    file: IncomingFile,
    sessionId?: string,
  ): Promise<{
    sessionId: string;
    fileHash: string;
    extractionId: string | null;
    isDuplicate: boolean;
  }> {
    const { valid, detectedMime } = validateMimeType(
      file.tempPath,
      file.mimeType,
    );
    if (!valid) {
      deleteTempFile(file.tempPath);
      throw new UnsupportedFormatError(detectedMime);
    }

    let resolvedSessionId = sessionId;
    if (!resolvedSessionId) {
      const session = await this.sessionRepo.create();
      resolvedSessionId = session.id;
    } else {
      const exists = await this.sessionRepo.exists(resolvedSessionId);
      if (!exists) {
        deleteTempFile(file.tempPath);
        throw new SessionNotFoundError(resolvedSessionId);
      }
    }

    const fileHash = hashFile(file.tempPath);

    const existing = await this.extractionRepo.findByHashAndSession(
      fileHash,
      resolvedSessionId,
    );
    if (existing) {
      deleteTempFile(file.tempPath);
      return {
        sessionId: resolvedSessionId,
        fileHash,
        extractionId: existing.id,
        isDuplicate: true,
      };
    }

    const extraction = await this.extractionRepo.create({
      sessionId: resolvedSessionId,
      fileName: file.originalName,
      fileHash,
      mimeType: detectedMime,
      status: ExtractionStatus.PROCESSING,
    });

    return {
      sessionId: resolvedSessionId,
      fileHash,
      extractionId: extraction.id,
      isDuplicate: false,
    };
  }

  async processSync(
    extractionId: string,
    file: IncomingFile,
  ): Promise<LLMExtractionResult> {
    const startedAt = Date.now();
    const fileBuffer = fs.readFileSync(file.tempPath);
    const provider = createLLMProvider();
    let rawResponse = "";

    try {
      rawResponse = await provider.extract(
        fileBuffer,
        file.mimeType,
        file.originalName,
      );
      const parsed = parseExtractionResponse<LLMExtractionResult>(rawResponse);

      await this.extractionRepo.update(extractionId, {
        status: ExtractionStatus.COMPLETE,
        documentType: parsed.detection.documentType,
        documentName: parsed.detection.documentName,
        category: parsed.detection.category,
        applicableRole: parsed.detection.applicableRole,
        confidence: parsed.detection.confidence,
        holderName: parsed.holder.fullName ?? undefined,
        dateOfBirth: parsed.holder.dateOfBirth ?? undefined,
        sirbNumber: parsed.holder.sirbNumber ?? undefined,
        passportNumber: parsed.holder.passportNumber ?? undefined,
        holderRank: parsed.holder.rank ?? undefined,
        holderNationality: parsed.holder.nationality ?? undefined,
        holderPhoto: parsed.holder.photo,
        issueDate: parsed.validity.dateOfIssue ?? undefined,
        expiryDate: parsed.validity.dateOfExpiry ?? undefined,
        isExpired: parsed.validity.isExpired,
        daysUntilExpiry: parsed.validity.daysUntilExpiry ?? undefined,
        revalidationRequired: parsed.validity.revalidationRequired ?? undefined,
        issuingAuthority: parsed.compliance.issuingAuthority,
        regulationReference: parsed.compliance.regulationReference ?? undefined,
        imoModelCourse: parsed.compliance.imoModelCourse ?? undefined,
        fitnessResult: parsed.medicalData.fitnessResult,
        drugTestResult: parsed.medicalData.drugTestResult,
        fieldsJson: JSON.stringify(parsed.fields),
        complianceJson: JSON.stringify(parsed.compliance),
        medicalJson: JSON.stringify(parsed.medicalData),
        flagsJson: JSON.stringify(parsed.flags),
        rawLlmResponse: rawResponse,
        promptVersion: env.LLM_PROVIDER + "-" + env.LLM_MODEL,
        processingTimeMs: Date.now() - startedAt,
        summary: parsed.summary,
      });

      deleteTempFile(file.tempPath);
      return parsed;
    } catch (err) {
      await this.extractionRepo.update(extractionId, {
        status: ExtractionStatus.FAILED,
        rawLlmResponse: rawResponse,
        processingTimeMs: Date.now() - startedAt,
      });
      deleteTempFile(file.tempPath);
      throw new LLMParseError(extractionId);
    }
  }

  async enqueueAsync(
    extractionId: string,
    sessionId: string,
    file: IncomingFile,
  ): Promise<string> {
    const job = await this.jobRepo.create({
      sessionId,
      extractionId,
      status: "QUEUED",
    });

    await extractionQueue.add(
      "extract",
      {
        extractionId,
        filePath: file.tempPath,
        fileName: file.originalName,
        mimeType: file.mimeType,
      },
      { jobId: job.id },
    );

    return job.id;
  }
}
