export const ExtractionStatus = {
  PROCESSING: "PROCESSING",
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
} as const;

export type ExtractionStatus =
  (typeof ExtractionStatus)[keyof typeof ExtractionStatus];

export const ExtractionMode = {
  SYNC: "sync",
  ASYNC: "async",
} as const;

export type ExtractionMode =
  (typeof ExtractionMode)[keyof typeof ExtractionMode];

// What the controller receives after multer processes the upload
export interface IncomingFile {
  originalName: string;
  mimeType: string;
  tempPath: string;
  sizeBytes: number;
}

// Returned when a duplicate is detected
export interface DuplicateExtractionResult {
  isDuplicate: true;
  extractionId: string;
}
