export interface ExtractionSummaryInput {
  documentType: string | null;
  documentName: string | null;
  applicableRole: string | null;
  holderName: string | null;
  dateOfBirth: string | null;
  sirbNumber: string | null;
  passportNumber: string | null;
  isExpired: boolean;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  fitnessResult: string | null;
  drugTestResult: string | null;
  flags: Array<{ severity: string; message: string }>;
  confidence: string | null;
}

function serializeDocuments(extractions: ExtractionSummaryInput[]): string {
  return extractions
    .map((e, i) => {
      const flags = e.flags.length > 0
        ? e.flags.map((f) => `[${f.severity}] ${f.message}`).join("; ")
        : "none";

      return `Document ${i + 1}:
  Type: ${e.documentType ?? "UNKNOWN"} (${e.documentName ?? "Unknown document"})
  Role: ${e.applicableRole ?? "N/A"}
  Holder: ${e.holderName ?? "NOT FOUND"}
  Date of Birth: ${e.dateOfBirth ?? "NOT FOUND"}
  SIRB: ${e.sirbNumber ?? "NOT FOUND"}
  Passport: ${e.passportNumber ?? "NOT FOUND"}
  Expires: ${e.expiryDate ?? "N/A"} | Expired: ${e.isExpired} | Days Until Expiry: ${e.daysUntilExpiry ?? "N/A"}
  Fitness: ${e.fitnessResult ?? "N/A"} | Drug Test: ${e.drugTestResult ?? "N/A"}
  Confidence: ${e.confidence ?? "N/A"}
  Flags: ${flags}`;
    })
    .join("\n\n");
}

export function buildValidationPrompt(
  detectedRole: string | null,
  extractions: ExtractionSummaryInput[]
): string {
  const role = detectedRole ?? "UNKNOWN";
  const documentList = serializeDocuments(extractions);

  return `You are a senior maritime compliance officer conducting a pre-deployment document review for a ${role} officer.

The following documents have been extracted from a seafarer's application. Perform a thorough cross-document compliance assessment.

DOCUMENTS:
${documentList}

ASSESSMENT TASKS:
1. HOLDER PROFILE — Identify the most consistent holder name, DOB, SIRB, and passport across all documents. Flag any discrepancies.
2. CONSISTENCY CHECKS — Compare holder name, date of birth, SIRB number, and passport number across all documents. Any mismatch is a compliance concern.
3. MISSING DOCUMENTS — Based on the detected role (${role}), identify which critical document types are absent. For DECK officers: COC, SIRB, PASSPORT, PEME, DRUG_TEST are required. For ENGINE officers: COC, SIRB, PASSPORT, PEME, DRUG_TEST are required. For BOTH: apply both sets.
4. EXPIRING DOCUMENTS — Flag any document expiring within 90 days or already expired.
5. MEDICAL FLAGS — Assess fitness result, drug test result, and any medical restrictions across PEME and DRUG_TEST documents.
6. OVERALL STATUS — Determine APPROVED, CONDITIONAL, or REJECTED based on: REJECTED if any critical document is expired or CRITICAL flag exists or drug test is POSITIVE or fitness is UNFIT. CONDITIONAL if any document expires within 90 days or any HIGH/MEDIUM flag exists or any required document is missing. APPROVED only if all required documents are present, valid, and consistent.
7. OVERALL SCORE — Score from 0 to 100 reflecting overall compliance health.

Return ONLY a valid JSON object. No markdown. No code fences. No preamble.

{
  "holderProfile": {
    "fullName": "string",
    "dateOfBirth": "string or null",
    "sirbNumber": "string or null",
    "passportNumber": "string or null",
    "detectedRole": "${role}",
    "nameVariants": ["list of name variants found across documents if any"]
  },
  "consistencyChecks": [
    {
      "field": "field name checked",
      "status": "PASS | FAIL | WARN",
      "details": "explanation"
    }
  ],
  "missingDocuments": [
    {
      "documentType": "SHORT_CODE",
      "documentName": "human readable name",
      "severity": "CRITICAL | HIGH | MEDIUM"
    }
  ],
  "expiringDocuments": [
    {
      "documentType": "string",
      "documentName": "string",
      "expiryDate": "string",
      "daysUntilExpiry": number,
      "isExpired": boolean
    }
  ],
  "medicalFlags": [
    {
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "message": "string"
    }
  ],
  "overallStatus": "APPROVED | CONDITIONAL | REJECTED",
  "overallScore": 0,
  "summary": "Two to three sentence plain English summary of the compliance assessment and deployment recommendation.",
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}`;
}