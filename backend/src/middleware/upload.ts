import multer from 'multer';
import { join } from 'path';
import { Request } from 'express';

const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';
const MAX_SIZE_MB = parseInt(process.env.MAX_ZIP_SIZE_MB || '25', 10);
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, join(TMP_DIR, 'uploads'));
  },
  filename: (_req: Request, _file: Express.Multer.File, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    cb(null, `upload-${uniqueSuffix}.zip`);
  },
});

// File filter - only accept .zip files
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/zip' || 
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.endsWith('.zip')) {
    cb(null, true);
  } else {
    cb(new Error('Only .zip files are allowed'));
  }
};

// Create multer instance
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_BYTES,
  },
});

// Made with Bob
