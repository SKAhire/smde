import { createHash } from "crypto";
import { readFileSync, unlink } from "fs";

export function hashFile(filePath: string): string {
  const buffer = readFileSync(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

export function deleteTempFile(filePath: string): void {
  unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error(`Failed to delete temp file ${filePath}:`, err.message);
    }
  });
}
