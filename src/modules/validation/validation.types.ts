export interface HolderProfile {
  fullName: string;
  dateOfBirth: string | null;
  sirbNumber: string | null;
  passportNumber: string | null;
  detectedRole: string;
  nameVariants: string[];
}

export interface ConsistencyCheck {
  field: string;
  status: "PASS" | "FAIL" | "WARN";
  details: string;
}

export interface MissingDocument {
  documentType: string;
  documentName: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
}

export interface ExpiringDocument {
  documentType: string;
  documentName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}

export interface MedicalFlag {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

export interface ValidationResult {
  holderProfile: HolderProfile;
  consistencyChecks: ConsistencyCheck[];
  missingDocuments: MissingDocument[];
  expiringDocuments: ExpiringDocument[];
  medicalFlags: MedicalFlag[];
  overallStatus: "APPROVED" | "CONDITIONAL" | "REJECTED";
  overallScore: number;
  summary: string;
  recommendations: string[];
}

export interface ValidationSummary {
  sessionId: string;
  holderProfile: HolderProfile;
  consistencyChecks: ConsistencyCheck[];
  missingDocuments: MissingDocument[];
  expiringDocuments: ExpiringDocument[];
  medicalFlags: MedicalFlag[];
  overallStatus: string;
  overallScore: number;
  summary: string;
  recommendations: string[];
  validatedAt: Date;
}

export interface ReportDocument {
  id: string;
  fileName: string;
  documentType: string | null;
  documentName: string | null;
  applicableRole: string | null;
  holderName: string | null;
  confidence: string | null;
  isExpired: boolean;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  flagCount: number;
  criticalFlagCount: number;
  fitnessResult: string | null;
  drugTestResult: string | null;
  createdAt: Date;
}

export interface SessionReport {
  sessionId: string;
  generatedAt: Date;
  holderProfile: HolderProfile | null;
  overallStatus: string | null;
  overallScore: number | null;
  documentSummary: ReportDocument[];
  complianceIssues: ConsistencyCheck[];
  expiringDocuments: ExpiringDocument[];
  missingDocuments: MissingDocument[];
  medicalSummary: {
    fitnessResult: string | null;
    drugTestResult: string | null;
    medicalFlags: MedicalFlag[];
  };
  recommendations: string[];
  validatedAt: Date | null;
}
