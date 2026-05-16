const SENSITIVE_PATTERNS = [
  // AWS Keys
  /AKIA[0-9A-Z]{16}/gi,
  // Generic API Keys
  /api[_-]?key[_-]?[=:]\s*['"]?[a-zA-Z0-9]{20,}['"]?/gi,
  // Passwords
  /password[_-]?[=:]\s*['"]?[^\s'"]{8,}['"]?/gi,
  // Tokens
  /token[_-]?[=:]\s*['"]?[a-zA-Z0-9]{20,}['"]?/gi,
  // Private Keys
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
  // Connection Strings
  /mongodb(\+srv)?:\/\/[^\s]+/gi,
  /postgres(ql)?:\/\/[^\s]+/gi,
  /mysql:\/\/[^\s]+/gi,
];

const REDACTION_TEXT = '[REDACTED]';

export const sanitizeScannerOutput = (output) => {
  if (!output || typeof output !== 'string') {
    return output;
  }

  let sanitized = output;

  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, REDACTION_TEXT);
  });

  return sanitized;
};

export const sanitizeScanResult = (scanResult) => {
  if (!scanResult || typeof scanResult !== 'object') {
    return scanResult;
  }

  const sanitized = JSON.parse(JSON.stringify(scanResult));

  const sanitizeRecursive = (obj) => {
    if (typeof obj === 'string') {
      return sanitizeScannerOutput(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeRecursive(item));
    }

    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = sanitizeRecursive(value);
      }
      return result;
    }

    return obj;
  };

  return sanitizeRecursive(sanitized);
};

// Made with Bob
