/*
  Warnings:

  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Session";

-- DropEnum
DROP TYPE "Confidence";

-- DropEnum
DROP TYPE "ExtractionStatus";

-- DropEnum
DROP TYPE "JobStatus";

-- DropEnum
DROP TYPE "ValidationStatus";

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "detectedRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extractions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "documentType" TEXT,
    "documentName" TEXT,
    "category" TEXT,
    "applicableRole" TEXT,
    "confidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "holderName" TEXT,
    "dateOfBirth" TEXT,
    "sirbNumber" TEXT,
    "passportNumber" TEXT,
    "holderRank" TEXT,
    "holderNationality" TEXT,
    "holderPhoto" TEXT,
    "issueDate" TEXT,
    "expiryDate" TEXT,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "daysUntilExpiry" INTEGER,
    "revalidationRequired" BOOLEAN,
    "issuingAuthority" TEXT,
    "regulationReference" TEXT,
    "imoModelCourse" TEXT,
    "fitnessResult" TEXT,
    "drugTestResult" TEXT,
    "fieldsJson" TEXT,
    "complianceJson" TEXT,
    "medicalJson" TEXT,
    "flagsJson" TEXT,
    "rawLlmResponse" TEXT,
    "promptVersion" TEXT,
    "processingTimeMs" INTEGER,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "extractionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "queuePosition" INTEGER,
    "webhookUrl" TEXT,
    "webhookDelivered" BOOLEAN NOT NULL DEFAULT false,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overallStatus" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "holderProfileJson" TEXT NOT NULL,
    "consistencyChecksJson" TEXT NOT NULL,
    "missingDocumentsJson" TEXT NOT NULL,
    "expiringDocumentsJson" TEXT NOT NULL,
    "medicalFlagsJson" TEXT NOT NULL,
    "recommendationsJson" TEXT NOT NULL,
    "summary" TEXT,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "validations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extractions_sessionId_idx" ON "extractions"("sessionId");

-- CreateIndex
CREATE INDEX "extractions_sessionId_documentType_idx" ON "extractions"("sessionId", "documentType");

-- CreateIndex
CREATE INDEX "extractions_fileHash_sessionId_idx" ON "extractions"("fileHash", "sessionId");

-- CreateIndex
CREATE INDEX "extractions_isExpired_documentType_idx" ON "extractions"("isExpired", "documentType");

-- CreateIndex
CREATE INDEX "extractions_expiryDate_idx" ON "extractions"("expiryDate");

-- CreateIndex
CREATE INDEX "extractions_status_idx" ON "extractions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_extractionId_key" ON "jobs"("extractionId");

-- CreateIndex
CREATE INDEX "jobs_status_queuedAt_idx" ON "jobs"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "jobs_sessionId_idx" ON "jobs"("sessionId");

-- CreateIndex
CREATE INDEX "validations_sessionId_validatedAt_idx" ON "validations"("sessionId", "validatedAt" DESC);

-- CreateIndex
CREATE INDEX "validations_overallStatus_idx" ON "validations"("overallStatus");

-- AddForeignKey
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_extractionId_fkey" FOREIGN KEY ("extractionId") REFERENCES "extractions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
