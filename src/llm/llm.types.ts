export interface ILLMProvider {
  extract(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<string>;
}

export interface LLMExtractionResult {
  detection: {
    documentType: string;
    documentName: string;
    category: string;
    applicableRole: string;
    isRequired: boolean;
    confidence: string;
    detectionReason: string;
  };
  holder: {
    fullName: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    passportNumber: string | null;
    sirbNumber: string | null;
    rank: string | null;
    photo: string;
  };
  fields: Array<{
    key: string;
    label: string;
    value: string;
    importance: string;
    status: string;
  }>;
  validity: {
    dateOfIssue: string | null;
    dateOfExpiry: string | null;
    isExpired: boolean;
    daysUntilExpiry: number | null;
    revalidationRequired: boolean | null;
  };
  compliance: {
    issuingAuthority: string;
    regulationReference: string | null;
    imoModelCourse: string | null;
    recognizedAuthority: boolean;
    limitations: string | null;
  };
  medicalData: {
    fitnessResult: string;
    drugTestResult: string;
    restrictions: string | null;
    specialNotes: string | null;
    expiryDate: string | null;
  };
  flags: Array<{
    severity: string;
    message: string;
  }>;
  summary: string;
}
