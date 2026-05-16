import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import unzipper from 'unzipper';

const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';
const MAX_ENTRIES = 5000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Custom Error Class
export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

export const extractZip = async (zipPath: string, scanId: string): Promise<string> => {
  const extractPath = join(TMP_DIR, 'repos', scanId);
  let skippedCount = 0;
  let entryCount = 0;

  console.log(`[${scanId}] Starting ZIP extraction`);

  try {
    // Ensure extract directory exists
    if (!existsSync(extractPath)) {
      mkdirSync(extractPath, { recursive: true });
    }

    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream(zipPath)
        .pipe(
          unzipper.Parse()
        );

      stream.on('entry', (entry: any) => {
        entryCount++;

        // Check entry count limit (zip bomb protection)
        if (entryCount > MAX_ENTRIES) {
          entry.autodrain();
          reject(new ExtractionError(`ZIP contains too many files (>${MAX_ENTRIES})`));
          return;
        }

        // Check file size limit (zip bomb protection)
        if (entry.vars.uncompressedSize > MAX_FILE_SIZE) {
          entry.autodrain();
          reject(new ExtractionError('ZIP contains file larger than 10MB'));
          return;
        }

        const filePath = entry.path;

        // Check for path traversal
        if (filePath.includes('..')) {
          console.log(`[${scanId}] Skipped path traversal: ${filePath}`);
          skippedCount++;
          entry.autodrain();
          return;
        }

        // Skip macOS metadata
        if (filePath.includes('__MACOSX/')) {
          skippedCount++;
          entry.autodrain();
          return;
        }

        // Extract the entry
        const fullPath = join(extractPath, filePath);
        
        if (entry.type === 'Directory') {
          if (!existsSync(fullPath)) {
            mkdirSync(fullPath, { recursive: true });
          }
          entry.autodrain();
        } else {
          // Ensure parent directory exists
          const parentDir = join(fullPath, '..');
          if (!existsSync(parentDir)) {
            mkdirSync(parentDir, { recursive: true });
          }
          entry.pipe(require('fs').createWriteStream(fullPath));
        }
      });

      stream.on('close', resolve);
      stream.on('error', reject);
    });

    // Post-extraction validation: count files
    const files = readdirSync(extractPath, { recursive: true });
    const fileCount = files.filter(f => {
      const fullPath = join(extractPath, f.toString());
      try {
        return statSync(fullPath).isFile();
      } catch {
        return false;
      }
    }).length;

    if (fileCount === 0) {
      throw new ExtractionError('Empty ZIP');
    }

    console.log(`[${scanId}] Extracted ${fileCount} files (skipped ${skippedCount})`);

    return extractPath;
  } finally {
    // Always delete ZIP file
    try {
      await unlink(zipPath);
      console.log(`[${scanId}] Deleted ZIP file`);
    } catch (error) {
      console.warn(`[${scanId}] Failed to delete ZIP:`, error);
    }
  }
};

// Made with Bob
