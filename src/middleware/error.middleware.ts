import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";
import { ZodError, type ZodIssue } from "zod";


export const ErrorCode = {
  UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT",
  INSUFFICIENT_DOCUMENTS: "INSUFFICIENT_DOCUMENTS",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  JOB_NOT_FOUND: "JOB_NOT_FOUND",
  LLM_JSON_PARSE_FAIL: "LLM_JSON_PARSE_FAIL",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];


export interface ErrorResponse {
  error: ErrorCode;
  message: string;
  extractionId?: string;
  retryAfterMs?: number | null;
}


export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly extractionId?: string;
  public readonly retryAfterMs?: number | null;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    extractionId?: string,
    retryAfterMs?: number | null,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.extractionId = extractionId;
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnsupportedFormatError extends AppError {
  constructor(mimeType?: string) {
    super(
      400,
      ErrorCode.UNSUPPORTED_FORMAT,
      mimeType
        ? `File type "${mimeType}" is not accepted. Accepted types: image/jpeg, image/png, application/pdf.`
        : "File type not accepted. Accepted types: image/jpeg, image/png, application/pdf.",
    );
    this.name = "UnsupportedFormatError";
  }
}

export class FileTooLargeError extends AppError {
  constructor() {
    super(413, ErrorCode.FILE_TOO_LARGE, "File exceeds the 10MB size limit.");
    this.name = "FileTooLargeError";
  }
}

export class SessionNotFoundError extends AppError {
  constructor(sessionId: string) {
    super(
      404,
      ErrorCode.SESSION_NOT_FOUND,
      `Session "${sessionId}" not found.`,
    );
    this.name = "SessionNotFoundError";
  }
}

export class JobNotFoundError extends AppError {
  constructor(jobId: string) {
    super(404, ErrorCode.JOB_NOT_FOUND, `Job "${jobId}" not found.`);
    this.name = "JobNotFoundError";
  }
}

export class LLMParseError extends AppError {
  constructor(extractionId?: string) {
    super(
      422,
      ErrorCode.LLM_JSON_PARSE_FAIL,
      "Document extraction failed after retry. The raw response has been stored for review.",
      extractionId,
      null,
    );
    this.name = "LLMParseError";
  }
}

export class InsufficientDocumentsError extends AppError {
  constructor() {
    super(
      400,
      ErrorCode.INSUFFICIENT_DOCUMENTS,
      "Validation requires at least 2 documents in the session.",
    );
    this.name = "InsufficientDocumentsError";
  }
}

export class RateLimitedError extends AppError {
  constructor(retryAfterMs: number) {
    super(
      429,
      ErrorCode.RATE_LIMITED,
      "Too many requests. Please slow down.",
      undefined,
      retryAfterMs,
    );
    this.name = "RateLimitedError";
  }
}


function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

function isMulterError(err: unknown): err is MulterError {
  return err instanceof MulterError;
}

function isZodError(err: unknown): err is ZodError {
  return err instanceof ZodError;
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isAppError(err)) {
    if (err.statusCode >= 500) {
      console.error({ err, path: req.path, method: req.method }, err.message);
    }

    const body: ErrorResponse = {
      error: err.code,
      message: err.message,
      ...(err.extractionId !== undefined && { extractionId: err.extractionId }),
      ...(err.retryAfterMs !== undefined && { retryAfterMs: err.retryAfterMs }),
    };

    if (err.code === ErrorCode.RATE_LIMITED && err.retryAfterMs) {
      res.setHeader("Retry-After", Math.ceil(err.retryAfterMs / 1000));
    }

    res.status(err.statusCode).json(body);
    return;
  }

  if (isMulterError(err)) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const body: ErrorResponse = {
        error: ErrorCode.FILE_TOO_LARGE,
        message: "File exceeds the 10MB size limit.",
      };
      res.status(413).json(body);
      return;
    }

    const body: ErrorResponse = {
      error: ErrorCode.UNSUPPORTED_FORMAT,
      message: `Upload error: ${err.message}`,
    };
    res.status(400).json(body);
    return;
  }

  if (isZodError(err)) {
    const message = err.issues
      .map((issue: ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    const body: ErrorResponse = {
      error: ErrorCode.VALIDATION_ERROR,
      message,
    };
    res.status(400).json(body);
    return;
  }

  console.error({ err, path: req.path, method: req.method }, "Unhandled error");

  const body: ErrorResponse = {
    error: ErrorCode.INTERNAL_ERROR,
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : err instanceof Error
          ? err.message
          : String(err),
  };

  res.status(500).json(body);
}
