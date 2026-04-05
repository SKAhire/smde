import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_TEMP_DIR = path.join(process.cwd(), "uploads", "temp");

if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
  fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_TEMP_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

// No fileFilter here — we validate MIME from actual file bytes in the service
// because HTTP clients often send wrong MIME types (e.g. .jfif as octet-stream)
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});
