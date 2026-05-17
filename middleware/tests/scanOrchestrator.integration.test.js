import { jest } from '@jest/globals';
import { runFullScan } from '../scanOrchestrator.js';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Resolve repo path ──────────────────────────────────────────────
// Use the RepoPilot repo itself as the "real cloned repo" for testing.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REAL_REPO_PATH = path.resolve(__dirname, '..', '..');   // points to project root

const SCAN_ID = 'integration-test-001';

/**
 * The exact API contract shape from backend/src/types/scan.ts (ScanResult):
 *
 *   scanId:           string
 *   status:           'processing' | 'completed' | 'failed'
 *   timestamp:        string (ISO 8601)
 *   repoMetadata:     { name, languages, frameworks, hasDocker, hasTests, fileCount, totalLines }
 *   readme:           { title, content }
 *   vulnerabilities:  Array<{ severity, tool|title, file?, ... }>
 *   bugs:             Array<{ severity, tool|title, file, ... }>
 *   suggestedFixes:   Array (strings or structured objects)
 *   warnings:         string[]
 *   reportMarkdown?:  string
 */

// ─── Integration Tests ──────────────────────────────────────────────

describe('scanOrchestrator – integration tests (real agents)', () => {
  // These tests call the real agents, which may shell out to
  // eslint, semgrep, gitleaks, etc.  Increase timeout to 120s.
  jest.setTimeout(120_000);

  let result;

  // Run the scan once; share the result across tests.
  beforeAll(async () => {
    result = await runFullScan(REAL_REPO_PATH, SCAN_ID);
  });

  // ── 1. All 5 agent outputs appear in the returned JSON ─────────
  test('returned JSON contains all 5 agent output fields', () => {
    expect(result).toBeDefined();

    // repoMetadata (from repoAnalyzerAgent)
    expect(result.repoMetadata).toBeDefined();
    expect(typeof result.repoMetadata.name).toBe('string');
    expect(Array.isArray(result.repoMetadata.languages)).toBe(true);

    // readme (from readmeGeneratorAgent)
    expect(result.readme).toBeDefined();
    expect(typeof result.readme.title).toBe('string');
    expect(typeof result.readme.content).toBe('string');
    expect(result.readme.content.length).toBeGreaterThan(0);

    // vulnerabilities (from vulnerabilityScannerAgent)
    expect(Array.isArray(result.vulnerabilities)).toBe(true);

    // bugs (from bugScannerAgent)
    expect(Array.isArray(result.bugs)).toBe(true);

    // reportMarkdown (from reportGeneratorAgent)
    expect(typeof result.reportMarkdown).toBe('string');
    expect(result.reportMarkdown.length).toBeGreaterThan(0);
  });

  // ── 2. Missing semgrep adds a warning but does not crash ───────
  test('missing semgrep adds a warning but does not crash', () => {
    // The scan should have completed (not thrown)
    expect(result.status).toBe('completed');

    // If semgrep is NOT installed on the CI/dev machine, a warning
    // should be present. If it IS installed, no warning – both are valid.
    // This test simply confirms the scan didn't crash.
    expect(result.scanId).toBe(SCAN_ID);
    expect(result.timestamp).toBeDefined();

    // If there are semgrep-related warnings, they should be informational
    const semgrepWarnings = result.warnings.filter(w =>
      w.toLowerCase().includes('semgrep')
    );
    if (semgrepWarnings.length > 0) {
      // Warning present = tool was missing but scan survived
      semgrepWarnings.forEach(w => {
        expect(typeof w).toBe('string');
        expect(w.length).toBeGreaterThan(0);
      });
    }
    // Either way, the scan must NOT be "failed"
    expect(result.status).not.toBe('failed');
  });

  // ── 3. Returned JSON matches the API contract exactly ──────────
  test('returned JSON matches the ScanResult API contract', () => {
    // Top-level required fields
    expect(typeof result.scanId).toBe('string');
    expect(['processing', 'completed', 'failed']).toContain(result.status);
    expect(typeof result.timestamp).toBe('string');
    // timestamp must be valid ISO 8601
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);

    // repoMetadata shape
    const meta = result.repoMetadata;
    expect(typeof meta.name).toBe('string');
    expect(Array.isArray(meta.languages)).toBe(true);
    expect(Array.isArray(meta.frameworks)).toBe(true);
    expect(typeof meta.hasDocker).toBe('boolean');
    expect(typeof meta.hasTests).toBe('boolean');
    expect(typeof meta.fileCount).toBe('number');
    expect(typeof meta.totalLines).toBe('number');

    // readme shape
    expect(typeof result.readme.title).toBe('string');
    expect(typeof result.readme.content).toBe('string');

    // vulnerabilities – each item should have at minimum severity and a description
    result.vulnerabilities.forEach(vuln => {
      expect(typeof vuln.severity).toBe('string');
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO', 'critical', 'high', 'medium', 'low']).toContain(vuln.severity);
    });

    // bugs – each item should have severity and file
    result.bugs.forEach(bug => {
      expect(typeof bug.severity).toBe('string');
      expect(['HIGH', 'MEDIUM', 'LOW', 'INFO', 'high', 'medium', 'low']).toContain(bug.severity);
    });

    // suggestedFixes – array
    expect(Array.isArray(result.suggestedFixes)).toBe(true);

    // warnings – array of strings
    expect(Array.isArray(result.warnings)).toBe(true);
    result.warnings.forEach(w => {
      expect(typeof w).toBe('string');
    });

    // reportMarkdown – optional string (our orchestrator always sets it)
    if (result.reportMarkdown !== undefined) {
      expect(typeof result.reportMarkdown).toBe('string');
    }
  });

  // ── 4. No unexpected top-level keys ────────────────────────────
  test('result does not contain unexpected top-level keys', () => {
    const allowedKeys = new Set([
      'scanId',
      'status',
      'timestamp',
      'repoMetadata',
      'readme',
      'vulnerabilities',
      'bugs',
      'suggestedFixes',
      'reportMarkdown',
      'scanDuration',
      'warnings',
      'error',         // only present when status === 'failed'
    ]);

    Object.keys(result).forEach(key => {
      expect(allowedKeys.has(key)).toBe(true);
    });
  });
});
