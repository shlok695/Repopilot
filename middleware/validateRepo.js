import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { logger } from './logger.js';

// Constants
const MAX_CONCURRENT_SCANS = 10;

// ZIP magic bytes: PK\x03\x04
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4B, 0x03, 0x04]);

// Shell metacharacters that could enable command injection
const SHELL_META_CHARS = /[;&|`$()<>]/;

// Known large monorepos that will likely timeout or consume too many resources
const BLOCKED_REPOS = new Set([
  'chromium/chromium',
  'torvalds/linux',
  'nicklockwood/swiftformat',
  'nicklockwood/layout',
  'nicklockwood/euclid',
  'nicklockwood/expression',
  'nicklockwood/consumer',
  'nicklockwood/sprinter',

  'nicklockwood/shape',
  'nicklockwood/shortcut',
  'nicklockwood/glbuilder',
]);

const VALID_ZIP_MIMETYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
  'application/octet-stream', // some clients send this
];

// ─── URL Sanitisation ────────────────────────────────────────────────

/**
 * Sanitise a GitHub URL: trim whitespace, lowercase the scheme.
 * @param {string} url
 * @returns {string}
 */
function sanitiseUrl(url) {
  if (typeof url !== 'string') return '';
  let cleaned = url.trim();
  // Lowercase the scheme portion (https:// or http://)
  cleaned = cleaned.replace(/^(https?:\/\/)/i, (match) => match.toLowerCase());
  // Remove trailing slash
  cleaned = cleaned.replace(/\/+$/, '');
  // Remove trailing .git if present (normalise)
  // Keep it – it's valid for cloning
  return cleaned;
}

/**
 * Extract owner/repo from a GitHub URL.
 * e.g. "https://github.com/owner/repo" → ["owner", "repo"]
 * @param {string} url – already sanitised
 * @returns {string[]} path segments after github.com
 */
function extractRepoSegments(url) {
  try {
    const parsed = new URL(url);
    // pathname starts with "/" so split and filter empties
    return parsed.pathname.split('/').filter(Boolean);
  } catch {
    return [];
  }
}

// ─── Validators ──────────────────────────────────────────────────────

/**
 * Validate a GitHub repository URL.
 *
 * Rules:
 *  1. Must be a non-empty string
 *  2. Must start with https://github.com/
 *  3. Must have at least owner/repo path segments
 *  4. Must NOT contain shell metacharacters: ; & | ` $ ( ) < >
 *  5. Blocked monorepos are rejected
 *  6. URLs with >2 segments get a warning (but are allowed)
 *
 * @param {string} repoUrl
 * @returns {{ valid: boolean, error?: string, warning?: string, sanitisedUrl?: string }}
 */
export function validateGitHubUrl(repoUrl) {
  // Rule 1: must be non-empty string
  if (!repoUrl || typeof repoUrl !== 'string') {
    return { valid: false, error: 'Repository URL is required and must be a string' };
  }

  // Sanitise first
  const url = sanitiseUrl(repoUrl);

  // Rule 2: must start with https://github.com/
  if (!url.startsWith('https://github.com/')) {
    return { valid: false, error: 'Invalid GitHub URL. Must start with https://github.com/' };
  }

  // Rule 4: shell metacharacter check (before parsing)
  if (SHELL_META_CHARS.test(url)) {
    return { valid: false, error: 'Invalid characters in repository URL – potential injection detected' };
  }

  // Rule 3: must have at least owner/repo
  const segments = extractRepoSegments(url);
  if (segments.length < 2) {
    return { valid: false, error: 'GitHub URL must include owner and repository name (e.g. https://github.com/owner/repo)' };
  }

  // Rule 5: blocked monorepo check
  const ownerRepo = `${segments[0]}/${segments[1]}`.toLowerCase();
  if (BLOCKED_REPOS.has(ownerRepo)) {
    return { valid: false, error: `Repository "${ownerRepo}" is too large to scan. Please use a smaller repository.` };
  }

  // Rule 6: >2 path segments → warn but allow
  let warning;
  if (segments.length > 2) {
    warning = `URL has ${segments.length} path segments – this may point to a subdirectory or branch, which could cause issues`;
  }

  return { valid: true, sanitisedUrl: url, ...(warning && { warning }) };
}

/**
 * Validate an uploaded ZIP file.
 *
 * Rules:
 *  1. file object must exist (not undefined/null)
 *  2. mimetype must be a valid ZIP type
 *  3. filename must end with .zip
 *  4. size must be ≤ 25 MB (26,214,400 bytes)
 *  5. First 4 bytes must be the PK ZIP signature (50 4B 03 04)
 *
 * @param {object} file – multer file object
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateZipFile(file) {
  // Rule 1: must exist
  if (!file) {
    return { valid: false, error: 'ZIP file is required' };
  }

  // Rule 2: mimetype check
  if (!VALID_ZIP_MIMETYPES.includes(file.mimetype)) {
    return { valid: false, error: `Invalid file type "${file.mimetype}". Only ZIP files are allowed` };
  }

  // Rule 3: extension check
  if (!file.originalname || !file.originalname.toLowerCase().endsWith('.zip')) {
    return { valid: false, error: 'File must have a .zip extension' };
  }

  // Rule 4: size check
  const maxBytes = config.maxZipSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File size ${sizeMB}MB exceeds maximum of ${config.maxZipSizeMb}MB` };
  }

  // Rule 5: PK signature check (magic bytes)
  if (file.path) {
    try {
      const fd = fs.openSync(file.path, 'r');
      const header = Buffer.alloc(4);
      fs.readSync(fd, header, 0, 4, 0);
      fs.closeSync(fd);

      if (!header.equals(ZIP_SIGNATURE)) {
        return { valid: false, error: 'File is not a valid ZIP archive (invalid file header)' };
      }
    } catch (err) {
      logger.warn('validateRepo', `Could not read ZIP header: ${err.message}`);
      // Allow it through – the extraction step will catch truly invalid files
    }
  } else if (file.buffer) {
    // In-memory upload (memoryStorage)
    if (file.buffer.length >= 4) {
      const header = file.buffer.subarray(0, 4);
      if (!header.equals(ZIP_SIGNATURE)) {
        return { valid: false, error: 'File is not a valid ZIP archive (invalid file header)' };
      }
    }
  }

  return { valid: true };
}

// ─── Rate-limit by folder count ──────────────────────────────────────

/**
 * Check if the scan folder count exceeds the concurrency limit.
 * @returns {{ allowed: boolean, count: number }}
 */
function checkScanRateLimit() {
  const scansDir = path.join(config.tmpDir, 'repos');
  try {
    if (!fs.existsSync(scansDir)) {
      return { allowed: true, count: 0 };
    }
    const entries = fs.readdirSync(scansDir, { withFileTypes: true });
    const folderCount = entries.filter(e => e.isDirectory()).length;
    return { allowed: folderCount <= MAX_CONCURRENT_SCANS, count: folderCount };
  } catch {
    // If we can't read the dir, allow the scan (fail open)
    return { allowed: true, count: 0 };
  }
}

// ─── Express Middleware ──────────────────────────────────────────────

/**
 * Express middleware that validates the incoming scan request.
 *
 * - Detects scan type from req.body.type ("github" | "zip")
 * - Runs the appropriate validator
 * - Checks folder-based rate limit (429 if >10 concurrent)
 * - Calls next() on success, responds 400/429 on failure
 */
export function validateScanRequest(req, res, next) {
  try {
    const { type, repoUrl } = req.body;

    // ── Rate-limit check ──────────────────────────────────────
    const rateCheck = checkScanRateLimit();
    if (!rateCheck.allowed) {
      logger.warn('validateRepo', `Rate limit hit: ${rateCheck.count} active scans`, { ip: req.ip });
      return res.status(429).json({
        status: 'error',
        message: `Too many concurrent scans (${rateCheck.count}). Please wait for existing scans to finish.`,
      });
    }

    // ── Type check ────────────────────────────────────────────
    if (!type || (type !== 'github' && type !== 'zip')) {
      logger.warn('validateRepo', `Blocked request: Invalid scan type "${type}"`, { ip: req.ip });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid scan type. Must be "github" or "zip"',
      });
    }

    // ── GitHub URL validation ─────────────────────────────────
    if (type === 'github') {
      const result = validateGitHubUrl(repoUrl);
      if (!result.valid) {
        logger.warn('validateRepo', `Blocked request: ${result.error}`, { ip: req.ip });
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }
      // Overwrite with sanitised URL
      if (result.sanitisedUrl) {
        req.body.repoUrl = result.sanitisedUrl;
      }
      // Attach warning for downstream logging (optional)
      if (result.warning) {
        req.validationWarning = result.warning;
      }
    }

    // ── ZIP file validation ───────────────────────────────────
    if (type === 'zip') {
      const result = validateZipFile(req.file);
      if (!result.valid) {
        logger.warn('validateRepo', `Blocked request: ${result.error}`, { ip: req.ip });
        return res.status(400).json({
          status: 'error',
          message: result.error,
        });
      }
    }

    next();
  } catch (error) {
    logger.error('validateRepo', `Validation error`, { error, ip: req.ip });
    res.status(400).json({
      status: 'error',
      message: error.message || 'Request validation failed',
    });
  }
}
