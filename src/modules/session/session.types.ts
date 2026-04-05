export const OverallHealth = {
  OK: "OK",
  WARN: "WARN",
  CRITICAL: "CRITICAL",
} as const;

export type OverallHealth = (typeof OverallHealth)[keyof typeof OverallHealth];

export interface SessionDocument {
  id: string;
  fileName: string;
  documentType: string | null;
  applicableRole: string | null;
  holderName: string | null;
  confidence: string | null;
  isExpired: boolean;
  flagCount: number;
  criticalFlagCount: number;
  createdAt: Date;
}

export interface SessionSummary {
  sessionId: string;
  documentCount: number;
  detectedRole: string | null;
  overallHealth: OverallHealth;
  documents: SessionDocument[];
  pendingJobs: PendingJob[];
}

export interface PendingJob {
  jobId: string;
  status: string;
  fileName: string | null;
}

export interface CreateSessionResult {
  id: string;
  createdAt: Date;
}

export interface ExtractionFlag {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

export function parseFlagsJson(raw: string | null): ExtractionFlag[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ExtractionFlag[];
  } catch {
    return [];
  }
}
