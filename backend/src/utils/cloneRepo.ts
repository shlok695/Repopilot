import simpleGit from 'simple-git';
import { join, posix } from 'path';
import { existsSync, readdirSync, mkdirSync } from 'fs';

const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';
const storagePath = (...parts: string[]): string => {
  return TMP_DIR.startsWith('/') ? posix.join(TMP_DIR, ...parts) : join(TMP_DIR, ...parts);
};
const CLONE_TIMEOUT_MS = 30000; // 30 seconds
const RETRY_DELAY_MS = 3000; // 3 seconds

// Custom Error Classes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class CloneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloneError';
  }
}

// Utility function to sanitize URLs (strip credentials)
const sanitizeUrl = (url: string): string => {
  return url.replace(/:([^@]+)@/, ':***@');
};

// Utility function to check if error is a network error
const isNetworkError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('econnreset')
  );
};

// Utility function to delay execution
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Main clone function
export const cloneRepo = async (repoUrl: string, scanId: string): Promise<string> => {
  const startTime = Date.now();
  
  // 1. Validate URL
  if (!repoUrl.startsWith('https://github.com/')) {
    throw new ValidationError('Invalid GitHub URL. Must start with https://github.com/');
  }

  // 2. Check for shell metacharacters
  if (/[;&|`$()]/.test(repoUrl)) {
    throw new ValidationError('Invalid characters in repository URL');
  }

  const repoPath = storagePath('repos', scanId);
  const sanitizedUrl = sanitizeUrl(repoUrl);

  // 3. Check if directory already exists
  if (existsSync(repoPath)) {
    throw new CloneError('Scan directory already exists');
  }

  // 4. Ensure parent directory exists
  const parentDir = storagePath('repos');
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  console.log(`[${scanId}] Starting clone: ${sanitizedUrl}`);

  // 5. Clone with retry logic
  let lastError: Error | null = null;
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;
    
    try {
      const git = simpleGit();

      // 6. Use Promise.race for timeout
      const clonePromise = git.clone(repoUrl, repoPath, ['--depth', '1']);
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) =>
        timeoutId = setTimeout(() => reject(new TimeoutError('Clone timeout after 30s')), CLONE_TIMEOUT_MS)
      );

      try {
        await Promise.race([clonePromise, timeoutPromise]);
      } finally {
        clearTimeout(timeoutId!);
      }

      // 7. Verify directory is non-empty
      const files = readdirSync(repoPath);
      const nonGitFiles = files.filter(f => f !== '.git');
      
      if (nonGitFiles.length === 0) {
        throw new CloneError('Empty repo');
      }

      // 8. Success - log completion
      const duration = Date.now() - startTime;
      console.log(`[${scanId}] Clone completed in ${duration}ms`);
      
      return repoPath;

    } catch (error) {
      lastError = error as Error;

      // Handle timeout errors immediately (no retry)
      if (error instanceof TimeoutError) {
        throw error;
      }

      // Handle network errors with retry
      if (attempt < maxAttempts && isNetworkError(error as Error)) {
        console.log(`[${scanId}] Retrying clone after network error...`);
        await delay(RETRY_DELAY_MS);
        continue;
      }

      // No more retries, break and handle error below
      break;
    }
  }

  // 9. Handle final error after retries
  if (lastError) {
    const errorMessage = lastError.message;

    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      throw new CloneError('Repository not found');
    }

    if (isNetworkError(lastError)) {
      throw new CloneError(`Network error: ${errorMessage}`);
    }

    throw new CloneError(`Failed to clone repository: ${errorMessage}`);
  }

  // Should never reach here, but TypeScript needs it
  throw new CloneError('Unknown error during clone');
};

// Made with Bob
