import simpleGit from 'simple-git';
import { join } from 'path';
import { AppError } from '../middleware/errorHandler.js';

const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';
const CLONE_TIMEOUT_MS = 30000; // 30 seconds

export const cloneRepo = async (repoUrl: string, scanId: string): Promise<string> => {
  // Validate URL
  if (!repoUrl.startsWith('https://github.com/')) {
    throw new AppError('Invalid GitHub URL. Must start with https://github.com/', 400);
  }

  // Check for shell metacharacters
  if (/[;&|`$()]/.test(repoUrl)) {
    throw new AppError('Invalid characters in repository URL', 400);
  }

  const repoPath = join(TMP_DIR, 'repos', scanId);

  try {
    const git = simpleGit({
      timeout: {
        block: CLONE_TIMEOUT_MS,
      },
    });

    await git.clone(repoUrl, repoPath, ['--depth', '1']);
    
    return repoPath;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new AppError('Repository clone timeout. The repository may be too large.', 408);
      }
      if (error.message.includes('not found') || error.message.includes('404')) {
        throw new AppError('Repository not found. Please check the URL.', 404);
      }
      throw new AppError(`Failed to clone repository: ${error.message}`, 500);
    }
    throw new AppError('Failed to clone repository', 500);
  }
};

// Made with Bob
