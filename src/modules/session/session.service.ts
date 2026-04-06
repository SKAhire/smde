import { SessionRepository } from "./session.repository";
import {
  CreateSessionResult,
  SessionDocument,
  SessionSummary,
  OverallHealth,
  PendingJob,
  parseFlagsJson,
} from "./session.types";
import { SessionNotFoundError } from "../../middleware/error.middleware";

export class SessionService {
  constructor(private readonly sessionRepo: SessionRepository) {}

  async createSession(): Promise<CreateSessionResult> {
    return this.sessionRepo.create();
  }

  async getSessionSummary(sessionId: string): Promise<SessionSummary> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);

    const documents: SessionDocument[] = session.extractions.map((e) => {
      const flags = parseFlagsJson(e.flagsJson);
      return {
        id: e.id,
        fileName: e.fileName,
        documentType: e.documentType,
        applicableRole: e.applicableRole,
        holderName: e.holderName,
        confidence: e.confidence,
        isExpired: e.isExpired,
        flagCount: flags.length,
        criticalFlagCount: flags.filter((f) => f.severity === "CRITICAL")
          .length,
        createdAt: e.createdAt,
      };
    });

    const pendingJobs: PendingJob[] = session.jobs.map((job) => ({
      jobId: job.id,
      status: job.status,
      fileName: job.extraction?.fileName ?? null,
    }));

    return {
      sessionId: session.id,
      documentCount: session.extractions.length,
      detectedRole: session.detectedRole,
      overallHealth: this.deriveOverallHealth(
        documents,
        pendingJobs.length > 0,
      ),
      documents,
      pendingJobs,
    };
  }

  async refreshDetectedRole(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) return;

    const roles = session.extractions
      .map((e) => e.applicableRole)
      .filter(Boolean) as string[];

    const hasDeck = roles.some((r) => r === "DECK" || r === "BOTH");
    const hasEngine = roles.some((r) => r === "ENGINE" || r === "BOTH");

    let detectedRole: string;
    if (hasDeck && hasEngine) detectedRole = "BOTH";
    else if (hasDeck) detectedRole = "DECK";
    else if (hasEngine) detectedRole = "ENGINE";
    else detectedRole = "N/A";

    await this.sessionRepo.updateDetectedRole(sessionId, detectedRole);
  }

  private deriveOverallHealth(
    documents: SessionDocument[],
    hasPendingJobs: boolean,
  ): OverallHealth {
    if (hasPendingJobs) return OverallHealth.WARN;

    for (const doc of documents) {
      if (doc.criticalFlagCount > 0 || doc.isExpired)
        return OverallHealth.CRITICAL;
    }

    for (const doc of documents) {
      if (doc.flagCount > 0) return OverallHealth.WARN;
      if (doc.isExpired !== null && doc.isExpired) return OverallHealth.WARN;
    }

    return OverallHealth.OK;
  }
}
