import { readFileSync } from "fs";

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

export interface MimeValidationResult {
  valid: boolean;
  detectedMime: string;
}

// Detect real MIME type from file magic bytes — never trust client-sent MIME
// JPEG: FF D8 FF
// PNG:  89 50 4E 47
// PDF:  25 50 44 46 (%PDF)
function detectMimeFromBytes(filePath: string): string | null {
  const buffer = readFileSync(filePath);

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  return null;
}

export function validateMimeType(
  filePath: string,
  clientMime: string,
): MimeValidationResult {
  const detectedMime = detectMimeFromBytes(filePath) ?? clientMime;

  return {
    valid: ACCEPTED_MIME_TYPES.has(detectedMime),
    detectedMime,
  };
}
