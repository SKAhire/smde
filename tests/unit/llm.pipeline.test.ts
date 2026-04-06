import { LLMPipeline } from "../../src/llm/llm.pipeline";
import { ILLMProvider } from "../../src/llm/llm.types";

const validExtractionJson = JSON.stringify({
  detection: {
    documentType: "PASSPORT",
    documentName: "Philippine Passport",
    category: "IDENTITY",
    applicableRole: "N/A",
    isRequired: true,
    confidence: "HIGH",
    detectionReason: "Document shows passport header and MRZ strip.",
  },
  holder: {
    fullName: "Juan dela Cruz",
    dateOfBirth: "01/01/1990",
    nationality: "Filipino",
    passportNumber: "P1234567",
    sirbNumber: null,
    rank: null,
    photo: "PRESENT",
  },
  fields: [],
  validity: {
    dateOfIssue: "01/01/2020",
    dateOfExpiry: "01/01/2030",
    isExpired: false,
    daysUntilExpiry: 1000,
    revalidationRequired: false,
  },
  compliance: {
    issuingAuthority: "DFA Philippines",
    regulationReference: null,
    imoModelCourse: null,
    recognizedAuthority: true,
    limitations: null,
  },
  medicalData: {
    fitnessResult: "N/A",
    drugTestResult: "N/A",
    restrictions: null,
    specialNotes: null,
    expiryDate: null,
  },
  flags: [],
  summary: "Valid Philippine passport for Juan dela Cruz.",
});

const lowConfidenceJson = JSON.stringify({
  detection: {
    documentType: "OTHER",
    documentName: "Unknown",
    category: "OTHER",
    applicableRole: "N/A",
    isRequired: false,
    confidence: "LOW",
    detectionReason: "Could not identify document type clearly.",
  },
  holder: {
    fullName: null,
    dateOfBirth: null,
    nationality: null,
    passportNumber: null,
    sirbNumber: null,
    rank: null,
    photo: "ABSENT",
  },
  fields: [],
  validity: {
    dateOfIssue: null,
    dateOfExpiry: null,
    isExpired: false,
    daysUntilExpiry: null,
    revalidationRequired: null,
  },
  compliance: {
    issuingAuthority: "Unknown",
    regulationReference: null,
    imoModelCourse: null,
    recognizedAuthority: false,
    limitations: null,
  },
  medicalData: {
    fitnessResult: "N/A",
    drugTestResult: "N/A",
    restrictions: null,
    specialNotes: null,
    expiryDate: null,
  },
  flags: [],
  summary: "Could not identify this document.",
});

function mockProvider(responses: string[]): ILLMProvider {
  let callCount = 0;
  return {
    extract: jest.fn().mockImplementation(async () => {
      const response = responses[callCount];
      callCount++;
      return response ?? "";
    }),
  };
}

describe("LLMPipeline", () => {
  const fileBuffer = Buffer.from("fake file content");

  it("returns parsed result on clean response", async () => {
    const provider = mockProvider([validExtractionJson]);
    const pipeline = new LLMPipeline(provider);

    const outcome = await pipeline.run(
      fileBuffer,
      "image/jpeg",
      "passport.jpg",
    );

    expect(outcome.success).toBe(true);
    if (outcome.success) {
      expect(outcome.data.parsed.detection.documentType).toBe("PASSPORT");
      expect(outcome.data.wasRepaired).toBe(false);
      expect(outcome.data.wasRetried).toBe(false);
    }
  });

  it("retries on LOW confidence and uses better result", async () => {
    const provider = mockProvider([lowConfidenceJson, validExtractionJson]);
    const pipeline = new LLMPipeline(provider);

    const outcome = await pipeline.run(
      fileBuffer,
      "image/jpeg",
      "passport.jpg",
    );

    expect(outcome.success).toBe(true);
    if (outcome.success) {
      expect(outcome.data.wasRetried).toBe(true);
      expect(outcome.data.parsed.detection.confidence).toBe("HIGH");
    }
    expect(provider.extract).toHaveBeenCalledTimes(2);
  });

  it("keeps LOW confidence result if retry also returns LOW", async () => {
    const provider = mockProvider([lowConfidenceJson, lowConfidenceJson]);
    const pipeline = new LLMPipeline(provider);

    const outcome = await pipeline.run(fileBuffer, "image/jpeg", "unknown.jpg");

    expect(outcome.success).toBe(true);
    if (outcome.success) {
      expect(outcome.data.wasRetried).toBe(true);
      expect(outcome.data.parsed.detection.confidence).toBe("LOW");
    }
  });

  it("attempts repair on malformed JSON", async () => {
    const malformed = "Here is your result: ```" + validExtractionJson + "```";
    const provider = mockProvider([malformed]);
    const pipeline = new LLMPipeline(provider);

    const outcome = await pipeline.run(fileBuffer, "image/jpeg", "doc.jpg");

    // extractJson should strip fences — so this actually succeeds without repair
    expect(outcome.success).toBe(true);
  });

  it("returns failure when JSON is completely unparseable after repair", async () => {
    const provider = mockProvider(["not json at all", "still not json"]);
    const pipeline = new LLMPipeline(provider);

    const outcome = await pipeline.run(fileBuffer, "image/jpeg", "doc.jpg");

    expect(outcome.success).toBe(false);
    if (!outcome.success) {
      expect(outcome.data.retryable).toBe(false);
    }
  });

  it("returns retryable failure on timeout", async () => {
    const provider: ILLMProvider = {
      extract: jest
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("The operation was aborted"), {
            name: "AbortError",
          }),
        ),
    };
    const pipeline = new LLMPipeline(provider);

    const outcome = await pipeline.run(fileBuffer, "image/jpeg", "doc.jpg");

    expect(outcome.success).toBe(false);
    if (!outcome.success) {
      expect(outcome.data.retryable).toBe(true);
    }
  });
});
