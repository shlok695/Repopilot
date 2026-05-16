import { jest } from '@jest/globals';

// ─── Mock logger before import ───────────────────────────────────────

jest.unstable_mockModule('../logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const { sanitizeScannerOutput, sanitizeScanResult } = await import('../sanitizeOutput.js');
const { logger } = await import('../logger.js');

// ─── sanitizeScannerOutput ───────────────────────────────────────────

describe('sanitizeScannerOutput', () => {

  test('AWS access key is redacted', () => {
    const input = 'Found key AKIAIOSFODNN7EXAMPLE in config';
    const { sanitised, redactionCount } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(sanitised).toContain('[REDACTED]');
    expect(redactionCount).toBeGreaterThanOrEqual(1);
  });

  test('password= value is redacted', () => {
    const input = 'database password=SuperSecret123! in config.yml';
    const { sanitised, redactionCount } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('SuperSecret123!');
    expect(sanitised).toContain('[REDACTED]');
    expect(redactionCount).toBeGreaterThanOrEqual(1);
  });

  test('password: value is redacted', () => {
    const input = 'DB_PASSWORD: my_p@ssw0rd_here';
    const { sanitised } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('my_p@ssw0rd_here');
    expect(sanitised).toContain('[REDACTED]');
  });

  test('token= value is redacted', () => {
    const input = 'AUTH token=eyJhbGciOiJIUzI1NiJ9.test';
    const { sanitised } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('eyJhbGciOiJIUzI1NiJ9.test');
    expect(sanitised).toContain('[REDACTED]');
  });

  test('secret= value is redacted', () => {
    const input = 'client secret=abcdef1234567890';
    const { sanitised } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('abcdef1234567890');
    expect(sanitised).toContain('[REDACTED]');
  });

  test('api_key= value is redacted', () => {
    const input = 'api_key=sk_live_abcdef1234567890';
    const { sanitised } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('sk_live_abcdef1234567890');
    expect(sanitised).toContain('[REDACTED]');
  });

  test('MongoDB connection string is redacted', () => {
    const input = 'Connection: mongodb+srv://admin:password123@cluster.mongodb.net/mydb';
    const { sanitised, redactionCount } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('admin:password123');
    expect(sanitised).not.toContain('cluster.mongodb.net');
    expect(sanitised).toContain('[REDACTED]');
    expect(redactionCount).toBeGreaterThanOrEqual(1);
  });

  test('PostgreSQL connection string is redacted', () => {
    const input = 'DB_URL=postgresql://user:pass@localhost:5432/mydb';
    const { sanitised } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('user:pass@localhost');
    expect(sanitised).toContain('[REDACTED]');
  });

  test('MySQL connection string is redacted', () => {
    const input = 'mysql://root:toor@db.example.com/production';
    const { sanitised } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('root:toor');
    expect(sanitised).toContain('[REDACTED]');
  });

  test('private key block is redacted', () => {
    const input = `Found:
-----BEGIN RSA PRIVATE KEY-----
MIIBogIBAAJBALRiMLAHudeSA/x3hB2f+2NRkJLA
-----END RSA PRIVATE KEY-----
in repo`;
    const { sanitised } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('MIIBogIBAAJBALRiMLAHudeSA');
    expect(sanitised).toContain('[REDACTED]');
  });

  test('GitHub personal access token is redacted', () => {
    const input = 'Using ghp_ABCDEFabcdef1234567890abcdef123456 for auth';
    const { sanitised } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('ghp_ABCDEFabcdef1234567890abcdef123456');
    expect(sanitised).toContain('[REDACTED]');
  });

  test('file paths are preserved', () => {
    const input = 'Issue in /src/controllers/auth.js at line 42: password=mySecret';
    const { sanitised } = sanitizeScannerOutput(input);

    expect(sanitised).toContain('/src/controllers/auth.js');
    expect(sanitised).toContain('line 42');
    expect(sanitised).not.toContain('mySecret');
  });

  test('severity labels are preserved', () => {
    const input = 'HIGH severity: Found token=abc123secret in config';
    const { sanitised } = sanitizeScannerOutput(input);

    expect(sanitised).toContain('HIGH severity');
    expect(sanitised).not.toContain('abc123secret');
  });

  test('issue descriptions are preserved', () => {
    const input = 'Hardcoded credential detected. password=admin123 should use env vars';
    const { sanitised } = sanitizeScannerOutput(input);

    expect(sanitised).toContain('Hardcoded credential detected');
    expect(sanitised).toContain('should use env vars');
    expect(sanitised).not.toContain('admin123');
  });

  test('null input returns null', () => {
    const { sanitised, redactionCount } = sanitizeScannerOutput(null);
    expect(sanitised).toBeNull();
    expect(redactionCount).toBe(0);
  });

  test('empty string returns empty string', () => {
    const { sanitised, redactionCount } = sanitizeScannerOutput('');
    expect(sanitised).toBe('');
    expect(redactionCount).toBe(0);
  });

  test('clean string has zero redactions', () => {
    const input = 'No secrets here, just clean code analysis results.';
    const { sanitised, redactionCount } = sanitizeScannerOutput(input);

    expect(sanitised).toBe(input);
    expect(redactionCount).toBe(0);
  });

  test('multiple secrets in one string are all redacted', () => {
    const input = 'password=secret1 api_key=secret2 token=secret3';
    const { sanitised, redactionCount } = sanitizeScannerOutput(input);

    expect(sanitised).not.toContain('secret1');
    expect(sanitised).not.toContain('secret2');
    expect(sanitised).not.toContain('secret3');
    expect(redactionCount).toBeGreaterThanOrEqual(3);
  });
});

// ─── sanitizeScanResult ──────────────────────────────────────────────

describe('sanitizeScanResult', () => {

  test('redacts secrets in all nested fields', () => {
    const scanResult = {
      scanId: 'scan_001',
      status: 'completed',
      timestamp: '2026-01-01T00:00:00.000Z',
      repoMetadata: {
        name: 'test-repo',
        languages: ['JavaScript'],
        frameworks: [],
        hasDocker: false,
        hasTests: true,
        fileCount: 10,
        totalLines: 500,
      },
      readme: {
        title: 'test-repo',
        content: '# test-repo\n\nDB connection: mongodb://admin:pass123@host/db',
      },
      vulnerabilities: [
        {
          severity: 'HIGH',
          tool: 'gitleaks',
          file: 'config/db.js',
          issue: 'Hardcoded password=DbPassword123 found',
          recommendation: 'Move to environment variables',
        },
      ],
      bugs: [],
      suggestedFixes: ['Update password= values to use env vars'],
      reportMarkdown: '# Report\n\nFound api_key=sk_test_abc123 in source code',
      warnings: [],
    };

    const result = sanitizeScanResult(scanResult);

    // Secrets are redacted
    expect(result.readme.content).not.toContain('admin:pass123');
    expect(result.vulnerabilities[0].issue).not.toContain('DbPassword123');
    expect(result.reportMarkdown).not.toContain('sk_test_abc123');
    expect(result.suggestedFixes[0]).not.toContain('password=');

    // Non-secret data preserved
    expect(result.scanId).toBe('scan_001');
    expect(result.status).toBe('completed');
    expect(result.repoMetadata.name).toBe('test-repo');
    expect(result.vulnerabilities[0].severity).toBe('HIGH');
    expect(result.vulnerabilities[0].tool).toBe('gitleaks');
    expect(result.vulnerabilities[0].file).toBe('config/db.js');
    expect(result.vulnerabilities[0].recommendation).toBe('Move to environment variables');
  });

  test('logs redaction count without logging actual values', () => {
    const scanResult = {
      scanId: 'scan_log_test',
      readme: { title: 'x', content: 'password=secret123' },
      vulnerabilities: [],
      bugs: [],
      warnings: [],
    };

    sanitizeScanResult(scanResult);

    // Logger should have been called with count info
    expect(logger.info).toHaveBeenCalledWith(
      'sanitizeOutput',
      expect.stringContaining('Redacted')
    );

    // Logger call should NOT contain the actual secret
    const calls = logger.info.mock.calls;
    const logMessages = calls.map(c => c.join(' ')).join(' ');
    expect(logMessages).not.toContain('secret123');
  });

  test('reportMarkdown is sanitised', () => {
    const scanResult = {
      scanId: 'scan_md',
      reportMarkdown: '# Report\n\nAWS Key: AKIAIOSFODNN7EXAMPLE found in env.js',
      vulnerabilities: [],
      bugs: [],
      warnings: [],
    };

    const result = sanitizeScanResult(scanResult);

    expect(result.reportMarkdown).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(result.reportMarkdown).toContain('[REDACTED]');
    expect(result.reportMarkdown).toContain('# Report');
  });

  test('null/undefined input returns as-is', () => {
    expect(sanitizeScanResult(null)).toBeNull();
    expect(sanitizeScanResult(undefined)).toBeUndefined();
  });

  test('clean scan result has no redactions', () => {
    const scanResult = {
      scanId: 'scan_clean',
      status: 'completed',
      readme: { title: 'clean', content: 'No secrets here' },
      vulnerabilities: [],
      bugs: [],
      suggestedFixes: [],
      reportMarkdown: '# Clean report',
      warnings: [],
    };

    const result = sanitizeScanResult(scanResult);

    expect(result.readme.content).toBe('No secrets here');
    expect(result.reportMarkdown).toBe('# Clean report');
  });

  test('does not mutate the original scan result', () => {
    const original = {
      scanId: 'scan_immutable',
      readme: { title: 'test', content: 'password=secret' },
      vulnerabilities: [],
      bugs: [],
      warnings: [],
    };

    const originalContent = original.readme.content;
    sanitizeScanResult(original);

    // Original should be unchanged
    expect(original.readme.content).toBe(originalContent);
  });

  test('preserves non-string fields (numbers, booleans)', () => {
    const scanResult = {
      scanId: 'scan_types',
      repoMetadata: {
        name: 'repo',
        fileCount: 42,
        totalLines: 1500,
        hasDocker: true,
        hasTests: false,
        languages: ['JS'],
        frameworks: [],
      },
      vulnerabilities: [],
      bugs: [],
      warnings: [],
    };

    const result = sanitizeScanResult(scanResult);

    expect(result.repoMetadata.fileCount).toBe(42);
    expect(result.repoMetadata.totalLines).toBe(1500);
    expect(result.repoMetadata.hasDocker).toBe(true);
    expect(result.repoMetadata.hasTests).toBe(false);
  });
});
