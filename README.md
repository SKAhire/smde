# Smart Maritime Document Extractor (SMDE)

A production-oriented backend service that allows maritime Manning Agents to upload seafarer certification documents and extract structured data from them automatically using a vision-capable LLM.

---

## What It Does

Manning Agents upload seafarer documents — certificates, medical exams, passports, drug tests — into a session. The service uses an LLM to detect the document type, extract relevant fields, flag compliance issues, and run cross-document validation to produce a hire/no-hire compliance report.

---

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express v5
- **Database:** PostgreSQL via Prisma ORM
- **Queue:** BullMQ + Redis
- **LLM Providers:** Gemini, Groq, Anthropic (switchable via env var)
- **Testing:** Jest + ts-jest

---

## Prerequisites

- Node.js 18+
- PostgreSQL running locally or remotely
- Redis running locally or remotely
- An API key for one of: Gemini, Groq, or Anthropic

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/SKAhire/smde.git
cd smde
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smde
PORT=3000
NODE_ENV=development

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.0-flash
LLM_API_KEY=your_api_key_here
LLM_TIMEOUT_MS=30000
```

**LLM Provider options:**

| Provider      | `LLM_PROVIDER` | Recommended `LLM_MODEL`        | Free Tier                 |
| ------------- | -------------- | ------------------------------ | ------------------------- |
| Google Gemini | `gemini`       | `gemini-2.0-flash`             | Yes — aistudio.google.com |
| Groq          | `groq`         | `llama-3.2-11b-vision-preview` | Yes — console.groq.com    |
| Anthropic     | `anthropic`    | `claude-haiku-4-5-20251001`    | Credits on signup         |

> Note: Anthropic does not support PDF input via the image API. Use Gemini or Groq if you need PDF extraction.

### 3. Start infrastructure

**Using Docker (recommended):**

```bash
docker compose up -d
```

This starts PostgreSQL and Redis. If you already have them running locally, skip this step.

**Without Docker:**

Start PostgreSQL and Redis however you normally do. On Windows, [Memurai](https://www.memurai.com) is the easiest Redis option without Docker or WSL.

### 4. Run database migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start the server

```bash
npm run dev
```

The server starts on `http://localhost:3000`. You should see:

```
🚀 Server running on port 3000 [development]
```

Verify everything is connected:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "OK",
  "dependencies": {
    "database": "OK",
    "llmProvider": "gemini",
    "queue": "OK"
  }
}
```

---

## API Reference

### Sessions

**Create a session**

```
POST /api/sessions
```

```json
{ "id": "uuid", "createdAt": "2026-03-17T08:40:00Z" }
```

**Get session summary**

```
GET /api/sessions/:sessionId
```

Returns all documents in the session, pending jobs, detected role, and overall health status.

---

### Document Extraction

**Extract a document**

```
POST /api/extract?mode=sync
POST /api/extract?mode=async
```

| Field       | Type | Required | Description                                 |
| ----------- | ---- | -------- | ------------------------------------------- |
| `document`  | File | Yes      | JPEG, PNG, or PDF. Max 10MB.                |
| `sessionId` | Text | No       | Omit to create a new session automatically. |

**Sync mode** — blocks until extraction completes, returns full result. Default for small files 100KB or less.

**Async mode** — returns `202` immediately with a `jobId`. Poll for result using the jobs endpoint.

**Sync response (200):**

```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "fileName": "PEME_Samoya.pdf",
  "documentType": "PEME",
  "documentName": "Pre-Employment Medical Examination",
  "applicableRole": "ENGINE",
  "confidence": "HIGH",
  "holderName": "Samuel P. Samoya",
  "fields": [...],
  "validity": { "isExpired": false, "daysUntilExpiry": 660 },
  "medicalData": { "fitnessResult": "FIT", "drugTestResult": "NEGATIVE" },
  "flags": [...],
  "summary": "..."
}
```

**Async response (202):**

```json
{
  "jobId": "uuid",
  "sessionId": "uuid",
  "status": "QUEUED",
  "pollUrl": "/api/jobs/uuid"
}
```

**Deduplication:** Uploading the same file to the same session returns the existing result immediately with header `X-Deduplicated: true`. No LLM call is made.

**Rate limit:** 10 requests per minute per IP. Returns `429` with `Retry-After` header when exceeded.

---

### Job Polling

**Get job status**

```
GET /api/jobs/:jobId
```

Responses vary by status:

```json
{ "jobId": "uuid", "status": "QUEUED", "queuePosition": 2, "estimatedWaitMs": 12000 }
{ "jobId": "uuid", "status": "PROCESSING", "startedAt": "..." }
{ "jobId": "uuid", "status": "COMPLETE", "extractionId": "uuid", "result": { ... }, "completedAt": "..." }
{ "jobId": "uuid", "status": "FAILED", "error": "LLM_JSON_PARSE_FAIL", "retryable": true }
```

---

### Validation

**Run cross-document compliance check**

```
POST /api/sessions/:sessionId/validate
```

Requires at least 2 documents in the session. Sends all extractions to the LLM for cross-document compliance assessment — checks name/DOB/SIRB consistency, missing required documents, expiring certificates, and medical flags.

```json
{
  "sessionId": "uuid",
  "holderProfile": { "fullName": "Francisco Salonoy", "detectedRole": "DECK" },
  "consistencyChecks": [...],
  "missingDocuments": [...],
  "expiringDocuments": [...],
  "medicalFlags": [...],
  "overallStatus": "CONDITIONAL",
  "overallScore": 74,
  "summary": "...",
  "recommendations": [...],
  "validatedAt": "2026-03-17T08:45:00Z"
}
```

**Get compliance report**

```
GET /api/sessions/:sessionId/report
```

Returns a structured report derived entirely from the database — no LLM call. Includes document summary, compliance issues, medical summary, and recommendations. Returns a partial report with empty arrays if validation has not been run yet.

---

### Health Check

```
GET /api/health
```

```json
{
  "status": "OK",
  "version": "1.0.0",
  "uptime": 3612,
  "dependencies": {
    "database": "OK",
    "llmProvider": "gemini",
    "queue": "OK"
  },
  "timestamp": "2026-03-17T08:45:00Z"
}
```

Returns `503` if any dependency is degraded.

---

## Error Responses

All errors follow this shape:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "retryAfterMs": 60000
}
```

| Status | Code                     | Condition                                     |
| ------ | ------------------------ | --------------------------------------------- |
| 400    | `UNSUPPORTED_FORMAT`     | File type not accepted                        |
| 400    | `INSUFFICIENT_DOCUMENTS` | Validate called with fewer than 2 documents   |
| 413    | `FILE_TOO_LARGE`         | File exceeds 10MB                             |
| 404    | `SESSION_NOT_FOUND`      | Session ID does not exist                     |
| 404    | `JOB_NOT_FOUND`          | Job ID does not exist                         |
| 422    | `LLM_JSON_PARSE_FAIL`    | LLM returned unparseable response after retry |
| 429    | `RATE_LIMITED`           | Too many requests                             |
| 500    | `INTERNAL_ERROR`         | Unexpected server error                       |

---

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

Unit tests cover JSON repair logic, MIME type detection, and LLM pipeline retry behaviour. Integration tests cover the happy path with mocked infrastructure.

---

## Project Structure

```
src/
├── config/         — Environment validation (Zod)
├── lib/            — Prisma and Redis singletons
├── middleware/     — Error handler, Multer, rate limiter
├── llm/            — Provider interface, factory, pipeline, prompts
├── queue/          — BullMQ queue instance
├── workers/        — BullMQ worker
├── utils/          — Hash, MIME detection, JSON extraction
└── modules/
    ├── session/    — Session CRUD and summary
    ├── extraction/ — File intake, LLM processing, deduplication
    ├── job/        — Async job status polling
    └── validation/ — Cross-document compliance and report
```

---

## docker-compose.yml

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: smde
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```
