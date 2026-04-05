import { ExtractionRepository } from "./extraction.repository";
import { SessionRepository } from "../session/session.repository";
import { IncomingFile, ExtractionStatus } from "./extraction.types";
import {
  SessionNotFoundError,
  UnsupportedFormatError,
} from "../../middleware/error.middleware";
import { hashFile, deleteTempFile } from "../../utils/hash.util";
import { validateMimeType } from "../../utils/mime.util";

export class ExtractionService {
  constructor(
    private readonly extractionRepo: ExtractionRepository,
    private readonly sessionRepo: SessionRepository,
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
    // Validate MIME from file bytes — not from client-sent header
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
      mimeType: detectedMime, // store the real detected MIME, not what client sent
      status: ExtractionStatus.PROCESSING,
    });

    return {
      sessionId: resolvedSessionId,
      fileHash,
      extractionId: extraction.id,
      isDuplicate: false,
    };
  }
}
