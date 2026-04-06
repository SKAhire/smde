// Must be first — mocked before any module that imports env
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 3000,
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
    LLM_PROVIDER: "gemini",
    LLM_MODEL: "gemini-2.0-flash",
    LLM_API_KEY: "test-key",
    LLM_TIMEOUT_MS: 30000,
  },
  isDevelopment: false,
  isProduction: false,
  isTest: true,
}));

jest.mock("../../src/lib/prisma", () => ({
  prisma: {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    extraction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    job: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      count: jest.fn(),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
    $disconnect: jest.fn(),
  },
}));

jest.mock("../../src/lib/redis", () => ({
  redisConnection: {
    ping: jest.fn().mockResolvedValue("PONG"),
    quit: jest.fn(),
    on: jest.fn(),
  },
}));

jest.mock("../../src/queue/extraction.queue", () => ({
  extractionQueue: {
    add: jest.fn().mockResolvedValue({ id: "bull-job-id" }),
  },
}));

jest.mock("../../src/llm/llm.factory", () => ({
  createLLMProvider: jest.fn().mockReturnValue({
    extract: jest.fn().mockResolvedValue(
      JSON.stringify({
        detection: {
          documentType: "PASSPORT",
          documentName: "Philippine Passport",
          category: "IDENTITY",
          applicableRole: "N/A",
          isRequired: true,
          confidence: "HIGH",
          detectionReason: "Passport header detected.",
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
        summary: "Valid Philippine passport.",
      }),
    ),
  }),
}));

jest.mock("../../src/workers/extraction.worker", () => ({}));

import request from "supertest";
import path from "path";
import fs from "fs";
import os from "os";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function createTempPdf(): string {
  const filePath = path.join(os.tmpdir(), `test-${Date.now()}.pdf`);
  fs.writeFileSync(
    filePath,
    Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]),
  );
  return filePath;
}

describe("POST /api/sessions", () => {
  it("creates a new session", async () => {
    (mockPrisma.session.create as jest.Mock).mockResolvedValue({
      id: "session-123",
      createdAt: new Date(),
    });

    const res = await request(app).post("/api/sessions");

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("session-123");
  });
});

describe("GET /api/sessions/:sessionId", () => {
  it("returns 404 for non-existent session", async () => {
    (mockPrisma.session.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get("/api/sessions/fake-id");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("SESSION_NOT_FOUND");
  });

  it("returns session summary for existing session", async () => {
    (mockPrisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: "session-123",
      detectedRole: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      extractions: [],
      jobs: [],
    });

    const res = await request(app).get("/api/sessions/session-123");

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe("session-123");
    expect(res.body.documentCount).toBe(0);
    expect(res.body.overallHealth).toBe("OK");
  });
});

describe("POST /api/extract (sync)", () => {
  let tempFilePath: string;

  beforeEach(() => {
    tempFilePath = createTempPdf();

    (mockPrisma.session.create as jest.Mock).mockResolvedValue({
      id: "session-new",
      createdAt: new Date(),
    });
    (mockPrisma.session.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.extraction.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.extraction.create as jest.Mock).mockResolvedValue({
      id: "extraction-123",
      sessionId: "session-new",
      fileName: "test.pdf",
      fileHash: "abc123",
      mimeType: "application/pdf",
      status: "PROCESSING",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (mockPrisma.extraction.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.extraction.findUnique as jest.Mock).mockResolvedValue({
      id: "extraction-123",
      sessionId: "session-new",
    });
    (mockPrisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: "session-new",
      detectedRole: null,
      extractions: [],
      jobs: [],
    });
    (mockPrisma.session.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.job.create as jest.Mock).mockResolvedValue({
      id: "job-123",
      sessionId: "session-new",
      extractionId: "extraction-123",
      status: "QUEUED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  });

  it("returns 200 with extraction result for valid PDF", async () => {
    const res = await request(app)
      .post("/api/extract?mode=sync")
      .attach("document", tempFilePath);

    expect(res.status).toBe(200);
    expect(res.body.documentType).toBe("PASSPORT");
    expect(res.body.sessionId).toBe("session-new");
  });

  it("returns 400 for unsupported file type", async () => {
    const txtPath = path.join(os.tmpdir(), "test.txt");
    fs.writeFileSync(txtPath, "hello world");

    try {
      const res = await request(app)
        .post("/api/extract")
        .attach("document", txtPath);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("UNSUPPORTED_FORMAT");
    } finally {
      fs.unlinkSync(txtPath);
    }
  });

  it("returns X-Deduplicated header for duplicate file", async () => {
    (mockPrisma.extraction.findFirst as jest.Mock).mockResolvedValue({
      id: "existing-extraction",
      sessionId: "session-new",
    });
    (mockPrisma.session.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app)
      .post("/api/extract")
      .field("sessionId", "session-new")
      .attach("document", tempFilePath);

    expect(res.status).toBe(200);
    expect(res.headers["x-deduplicated"]).toBe("true");
  });
});

describe("GET /api/health", () => {
  it("returns OK when all dependencies healthy", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(res.body.dependencies.database).toBe("OK");
    expect(res.body.dependencies.queue).toBe("OK");
  });
});
