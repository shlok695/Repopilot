import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import unzipper from 'unzipper';
import { AppError } from '../middleware/errorHandler.js';

const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';

export const extractZip = async (zipPath: string, scanId: string): Promise<string> => {
  const extractPath = join(TMP_DIR, 'repos', scanId);

  try {
    await new Promise<void>((resolve, reject) => {
      createReadStream(zipPath)
        .pipe(
          unzipper.Extract({ 
            path: extractPath,
            // Reject path traversal attempts
            filter: (file) => {
              if (file.path.includes('..')) {
                return false;
              }
              return true;
            },
          })
        )
        .on('close', resolve)
        .on('error', reject);
    });

    // Delete the ZIP file after extraction
    await unlink(zipPath);

    return extractPath;
  } catch (error) {
    // Try to clean up the ZIP file even if extraction failed
    try {
      await unlink(zipPath);
    } catch {
      // Ignore cleanup errors
    }

    if (error instanceof Error) {
      throw new AppError(`Failed to extract ZIP file: ${error.message}`, 500);
    }
    throw new AppError('Failed to extract ZIP file', 500);
  }
};

// Made with Bob
