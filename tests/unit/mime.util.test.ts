import fs from "fs";
import path from "path";
import os from "os";
import { validateMimeType } from "../../src/utils/mime.util";

function writeTempFile(bytes: Buffer): string {
  const filePath = path.join(os.tmpdir(), `mime-test-${Date.now()}`);
  fs.writeFileSync(filePath, bytes);
  return filePath;
}

function cleanup(filePath: string) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

describe("validateMimeType", () => {
  it("detects JPEG from magic bytes regardless of client mime", () => {
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    const filePath = writeTempFile(jpegBytes);

    try {
      const result = validateMimeType(filePath, "application/octet-stream");
      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe("image/jpeg");
    } finally {
      cleanup(filePath);
    }
  });

  it("detects PNG from magic bytes", () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]);
    const filePath = writeTempFile(pngBytes);

    try {
      const result = validateMimeType(filePath, "application/octet-stream");
      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe("image/png");
    } finally {
      cleanup(filePath);
    }
  });

  it("detects PDF from magic bytes", () => {
    const pdfBytes = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const filePath = writeTempFile(pdfBytes);

    try {
      const result = validateMimeType(filePath, "application/octet-stream");
      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe("application/pdf");
    } finally {
      cleanup(filePath);
    }
  });

  it("rejects unknown file type", () => {
    const unknownBytes = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const filePath = writeTempFile(unknownBytes);

    try {
      const result = validateMimeType(filePath, "application/octet-stream");
      expect(result.valid).toBe(false);
    } finally {
      cleanup(filePath);
    }
  });

  it("falls back to client mime when magic bytes unrecognized", () => {
    const unknownBytes = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const filePath = writeTempFile(unknownBytes);

    try {
      const result = validateMimeType(filePath, "image/jpeg");
      expect(result.detectedMime).toBe("image/jpeg");
    } finally {
      cleanup(filePath);
    }
  });
});
