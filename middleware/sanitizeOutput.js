import { logger } from './logger.js';

// ─── Constants ───────────────────────────────────────────────────────

const REDACTED = '[REDACTED]';

// ─── Built-in redaction patterns ─────────────────────────────────────
// Each entry: { name, pattern (regex with global+case-insensitive flags) }

const BUILTIN_PATTERNS = [
  // AWS Access Key IDs (always start with AKIA)
  {
    name: 'AWS Key',
    pattern: /AKIA[0-9A-Z]{16}/gi,
  },
  // Generic API keys: api_key=..., apikey:..., api-key = ...
  {
    name: 'API Key',
    pattern: /(api_key|apikey|api-key)\s*[:=]\s*\S+/gi,
  },
  // Passwords: password=..., passwd:..., pwd = ...
  {
    name: 'Password',
    pattern: /(password|passwd|pwd)\s*[:=]\s*\S+/gi,
  },
  // Tokens and secrets: token=..., secret:..., bearer ...
  {
    name: 'Token/Secret',
    pattern: /(token|secret|bearer)\s*[:=]\s*\S+/gi,
  },
  // Private keys (RSA, EC, OPENSSH)
  {
    name: 'Private Key',
    pattern: /-----BEGIN\s+(RSA\s+|EC\s+|OPENSSH\s+)?PRIVATE\s+KEY-----[\s\S]+?-----END\s+(RSA\s+|EC\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/gi,
  },
  // MongoDB connection strings: mongodb://user:pass@host or mongodb+srv://...
  {
    name: 'MongoDB URI',
    pattern: /mongodb(\+srv)?:\/\/[^\s'"]+/gi,
  },
  // PostgreSQL connection strings
  {
    name: 'PostgreSQL URI',
    pattern: /postgres(ql)?:\/\/[^\s'"]+/gi,
  },
  // MySQL connection strings
  {
    name: 'MySQL URI',
    pattern: /mysql:\/\/[^\s'"]+/gi,
  },
  // Generic connection strings with credentials
  {
    name: 'Connection String',
    pattern: /:\/\/[^:]+:[^@]+@[^\s'"]+/gi,
  },
  // GitHub tokens
  {
    name: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{20,255}/gi,
  },
  // Slack tokens
  {
    name: 'Slack Token',
    pattern: /xox[baprs]-[A-Za-z0-9-]+/gi,
  },
  // JWT tokens (3 base64 segments separated by dots)
  {
    name: 'JWT',
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/gi,
  },
];

// ─── Custom patterns from environment variable ──────────────────────

import { config } from './config.js';

/**
 * Load custom regex patterns from the REDACT_PATTERNS env var.
 * Format: comma-separated regex strings (without flags — gi is applied).
 *
 * Example: REDACT_PATTERNS="sk-[a-zA-Z0-9]{48},whsec_[a-zA-Z0-9]+"
 *
 * @returns {{ name: string, pattern: RegExp }[]}
 */
function loadCustomPatterns() {
  const raw = config.redactPatterns;
  if (!raw || typeof raw !== 'string') return [];

  const patterns = [];
  const entries = raw.split(',').map(s => s.trim()).filter(Boolean);

  for (const entry of entries) {
    try {
      patterns.push({
        name: `Custom(${entry.substring(0, 20)})`,
        pattern: new RegExp(entry, 'gi'),
      });
    } catch (err) {
      logger.warn('sanitizeOutput', `Invalid custom redaction pattern "${entry}": ${err.message}`);
    }
  }

  return patterns;
}

/**
 * Get all active redaction patterns (built-in + custom).
 * @returns {{ name: string, pattern: RegExp }[]}
 */
function getAllPatterns() {
  return [...BUILTIN_PATTERNS, ...loadCustomPatterns()];
}

// ─── Shannon entropy calculation ─────────────────────────────────────

/**
 * Calculate Shannon entropy of a string.
 * Higher entropy = more random = more likely to be a secret.
 *
 * @param {string} str
 * @returns {number} bits per character
 */
function shannonEntropy(str) {
  if (!str || str.length === 0) return 0;

  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

// Threshold: strings longer than 40 chars with entropy > 4.5 bits/char
// are likely secrets or encoded data
const HIGH_ENTROPY_MIN_LENGTH = 40;
const HIGH_ENTROPY_THRESHOLD = 4.5;

/**
 * Scan a string for remaining high-entropy substrings that may be secrets
 * missed by pattern matching.
 *
 * @param {string} text
 * @returns {string[]} warning messages for flagged strings
 */
function detectHighEntropyStrings(text) {
  if (!text || typeof text !== 'string') return [];

  const warnings = [];
  // Split by whitespace, quotes, and common delimiters
  const tokens = text.split(/[\s'"`,;:={}[\]()]+/).filter(Boolean);

  for (const token of tokens) {
    if (token.length >= HIGH_ENTROPY_MIN_LENGTH && token !== REDACTED) {
      const entropy = shannonEntropy(token);
      if (entropy >= HIGH_ENTROPY_THRESHOLD) {
        // Don't log the actual value — just flag it
        warnings.push(
          `High-entropy string detected (${token.length} chars, entropy=${entropy.toFixed(2)}). ` +
          `This may be an unredacted secret — please review manually.`
        );
      }
    }
  }

  return warnings;
}

// ─── Core sanitisation functions ─────────────────────────────────────

/**
 * Sanitise a single string by redacting all matching sensitive patterns.
 *
 * Preserves: file paths, line numbers, issue types, severity, recommendations.
 * Redacts: secrets, keys, tokens, connection strings, private keys.
 *
 * @param {string} output – terminal output, Markdown, or JSON stringified
 * @returns {{ sanitised: string, redactionCount: number }}
 */
export function sanitizeScannerOutput(output) {
  if (!output || typeof output !== 'string') {
    return { sanitised: output, redactionCount: 0 };
  }

  let sanitised = output;
  let totalRedactions = 0;
  const patterns = getAllPatterns();

  for (const { pattern } of patterns) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;

    const matches = sanitised.match(pattern);
    if (matches) {
      totalRedactions += matches.length;
      sanitised = sanitised.replace(pattern, REDACTED);
    }
  }

  return { sanitised, redactionCount: totalRedactions };
}

/**
 * Recursively sanitise all string values in an object/array.
 * Returns the sanitised copy and total redaction count.
 *
 * @param {any} obj
 * @returns {{ result: any, redactionCount: number }}
 */
function sanitizeRecursive(obj) {
  let totalRedactions = 0;

  if (typeof obj === 'string') {
    const { sanitised, redactionCount } = sanitizeScannerOutput(obj);
    return { result: sanitised, redactionCount };
  }

  if (Array.isArray(obj)) {
    const arr = obj.map(item => {
      const { result, redactionCount } = sanitizeRecursive(item);
      totalRedactions += redactionCount;
      return result;
    });
    return { result: arr, redactionCount: totalRedactions };
  }

  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const { result: sanitisedValue, redactionCount } = sanitizeRecursive(value);
      totalRedactions += redactionCount;
      result[key] = sanitisedValue;
    }
    return { result, redactionCount: totalRedactions };
  }

  // Numbers, booleans, null, undefined — pass through
  return { result: obj, redactionCount: 0 };
}

// ─── Public: sanitise a full ScanResult object ───────────────────────

/**
 * Sanitise an entire ScanResult object.
 *
 * - Deep-clones the input (no mutation)
 * - Applies pattern-based redaction to every string field recursively
 * - Explicitly sanitises reportMarkdown
 * - Scans for remaining high-entropy strings and adds warnings
 * - Logs total redaction count (never logs actual secret values)
 *
 * @param {object} scanResult
 * @returns {object} sanitised ScanResult
 */
export function sanitizeScanResult(scanResult) {
  if (!scanResult || typeof scanResult !== 'object') {
    return scanResult;
  }

  // Deep clone to avoid mutating the original
  const cloned = JSON.parse(JSON.stringify(scanResult));

  // Recursively sanitise all string fields
  const { result: sanitised, redactionCount } = sanitizeRecursive(cloned);

  // Log redaction stats (never log actual values)
  if (redactionCount > 0) {
    logger.info(
      'sanitizeOutput',
      `Redacted ${redactionCount} sensitive value(s) from scan result [${sanitised.scanId || 'unknown'}]`
    );
  }

  // ── High-entropy detection on key string fields ─────────────
  const entropyWarnings = [];

  // Check reportMarkdown specifically
  if (sanitised.reportMarkdown && typeof sanitised.reportMarkdown === 'string') {
    entropyWarnings.push(...detectHighEntropyStrings(sanitised.reportMarkdown));
  }

  // Check readme content
  if (sanitised.readme && typeof sanitised.readme.content === 'string') {
    entropyWarnings.push(...detectHighEntropyStrings(sanitised.readme.content));
  }

  // Check vulnerability and bug issue/recommendation fields
  const findings = [...(sanitised.vulnerabilities || []), ...(sanitised.bugs || [])];
  for (const finding of findings) {
    if (finding.issue) entropyWarnings.push(...detectHighEntropyStrings(finding.issue));
    if (finding.recommendation) entropyWarnings.push(...detectHighEntropyStrings(finding.recommendation));
  }

  // Add entropy warnings to the result (deduplicated)
  if (entropyWarnings.length > 0) {
    if (!Array.isArray(sanitised.warnings)) {
      sanitised.warnings = [];
    }
    const uniqueWarnings = [...new Set(entropyWarnings)];
    sanitised.warnings.push(...uniqueWarnings);

    logger.warn(
      'sanitizeOutput',
      `Found ${uniqueWarnings.length} high-entropy string(s) that may be unredacted secrets [${sanitised.scanId || 'unknown'}]`
    );
  }

  return sanitised;
}
