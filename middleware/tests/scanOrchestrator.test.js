import { jest } from '@jest/globals';

// ─── Mock setup (must be before dynamic import) ──────────────────────

const mockAnalyzeRepo = jest.fn();
const mockGenerateReadme = jest.fn();
const mockScanVulnerabilities = jest.fn();
const mockScanBugs = jest.fn();
const mockGenerateFinalReport = jest.fn();

jest.unstable_mockModule('../../agents/repoAnalyzerAgent.js', () => ({
  analyzeRepo: mockAnalyzeRepo,
}));
jest.unstable_mockModule('../../agents/readmeGeneratorAgent.js', () => ({
  generateReadme: mockGenerateReadme,
}));
jest.unstable_mockModule('../../agents/vulnerabilityScannerAgent.js', () => ({
  scanVulnerabilities: mockScanVulnerabilities,
}));
jest.unstable_mockModule('../../agents/bugScannerAgent.js', () => ({
  scanBugs: mockScanBugs,
}));
jest.unstable_mockModule('../../agents/reportGeneratorAgent.js', () => ({
  generateFinalReport: mockGenerateFinalReport,
}));

// Import the module under test AFTER mocks are registered
const { runFullScan } = await import('../scanOrchestrator.js');

// ─── Test fixtures ───────────────────────────────────────────────────

const SCAN_ID = 'test-scan-001';
const REPO_PATH = '/tmp/repopilot/test-repo';

const fakeMetadata = {
  name: 'test-repo',
  languages: ['JavaScript'],
  frameworks: ['Express'],
  hasDocker: true,
  hasTests: true,
  fileCount: 42,
  totalLines: 1500,
};

const fakeReadme = {
  title: 'test-repo',
  content: '# test-repo\n\nA test repository.',
};

const fakeVulnResult = {
  findings: [
    {
      severity: 'HIGH',
      tool: 'npm-audit',
      file: 'package.json',
      issue: 'Vulnerable dependency: lodash prototype pollution',
      recommendation: 'Update lodash to >=4.17.21',
    },
    {
      severity: 'MEDIUM',
      tool: 'semgrep',
      file: 'src/auth.js',
      issue: 'Hardcoded secret detected',
      recommendation: 'Move secrets to environment variables',
    },
  ],
  warnings: [],
};

const fakeBugResult = {
  findings: [
    {
      severity: 'MEDIUM',
      tool: 'eslint',
      file: 'src/utils.js',
      issue: 'Unused variable: tempData',
      recommendation: 'Remove unused variables',
    },
    {
      severity: 'HIGH',
      tool: 'pattern-scan',
      file: 'src/db.js',
      issue: 'Empty catch block swallows errors',
      recommendation: 'Add proper error handling',
    },
  ],
  warnings: [],
};

const fakeReport = '# Scan Report\n\nAll checks passed.';

// ─── Helper: set all agents to succeed ───────────────────────────────

function setAllAgentsSucceed() {
  mockAnalyzeRepo.mockResolvedValue(fakeMetadata);
  mockGenerateReadme.mockResolvedValue(fakeReadme);
  mockScanVulnerabilities.mockResolvedValue(fakeVulnResult);
  mockScanBugs.mockResolvedValue(fakeBugResult);
  mockGenerateFinalReport.mockResolvedValue(fakeReport);
}

function setAllAgentsFail() {
  mockAnalyzeRepo.mockRejectedValue(new Error('analyzeRepo exploded'));
  mockGenerateReadme.mockRejectedValue(new Error('generateReadme exploded'));
  mockScanVulnerabilities.mockRejectedValue(new Error('scanVulnerabilities exploded'));
  mockScanBugs.mockRejectedValue(new Error('scanBugs exploded'));
  mockGenerateFinalReport.mockRejectedValue(new Error('generateFinalReport exploded'));
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('scanOrchestrator – runFullScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Test 1: All agents succeed ─────────────────────────────────
  test('all agents succeed – result has all fields populated', async () => {
    setAllAgentsSucceed();

    const result = await runFullScan(REPO_PATH, SCAN_ID);

    // Status
    expect(result.status).toBe('completed');
    expect(result.scanId).toBe(SCAN_ID);
    expect(result.timestamp).toBeDefined();

    // All fields populated
    expect(result.repoMetadata).toEqual(fakeMetadata);
    expect(result.readme).toEqual(fakeReadme);
    expect(result.vulnerabilities).toEqual(fakeVulnResult.findings);
    expect(result.bugs).toEqual(fakeBugResult.findings);
    expect(result.reportMarkdown).toBe(fakeReport);

    // Suggested fixes is a non-empty array (generated from findings)
    expect(Array.isArray(result.suggestedFixes)).toBe(true);
    expect(result.suggestedFixes.length).toBeGreaterThan(0);

    // Warnings should be empty (or only generic ones)
    expect(Array.isArray(result.warnings)).toBe(true);

    // All 5 agents were called
    expect(mockAnalyzeRepo).toHaveBeenCalledWith(REPO_PATH);
    expect(mockGenerateReadme).toHaveBeenCalledWith(REPO_PATH, fakeMetadata);
    expect(mockScanVulnerabilities).toHaveBeenCalledWith(REPO_PATH, fakeMetadata);
    expect(mockScanBugs).toHaveBeenCalledWith(REPO_PATH, fakeMetadata);
    expect(mockGenerateFinalReport).toHaveBeenCalledTimes(1);
  });

  // ── Test 2: One agent throws – warning added, other fields present ─
  test('one agent throws – warning added but other fields present', async () => {
    setAllAgentsSucceed();
    // Make vulnerability scanner fail
    mockScanVulnerabilities.mockRejectedValue(new Error('npm audit crashed'));

    const result = await runFullScan(REPO_PATH, SCAN_ID);

    // Scan still completes
    expect(result.status).toBe('completed');

    // Other fields are still populated
    expect(result.repoMetadata).toEqual(fakeMetadata);
    expect(result.readme).toEqual(fakeReadme);
    expect(result.bugs).toEqual(fakeBugResult.findings);
    expect(result.reportMarkdown).toBe(fakeReport);

    // Vulnerabilities fall back to empty
    expect(result.vulnerabilities).toEqual([]);

    // Warning was recorded
    expect(result.warnings.some(w => w.includes('Vulnerability Scanning'))).toBe(true);
  });

  // ── Test 3: All agents throw – status is "failed" ─────────────
  test('all agents throw – status is "failed"', async () => {
    setAllAgentsFail();

    const result = await runFullScan(REPO_PATH, SCAN_ID);

    expect(result.status).toBe('failed');
    expect(result.scanId).toBe(SCAN_ID);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');

    // Warnings should contain failure messages for each agent
    expect(result.warnings.length).toBeGreaterThanOrEqual(5);
  });

  // ── Test 4: Agent timeout – warning includes "timed out" ──────
  test('agent timeout – warning includes "timed out"', async () => {
    setAllAgentsSucceed();

    // Make bug scanner time out (simulated by the withTimeout wrapper)
    mockScanBugs.mockImplementation(
      () => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Bug scanning timed out after 30000ms')), 10);
      })
    );

    const result = await runFullScan(REPO_PATH, SCAN_ID);

    expect(result.status).toBe('completed');

    // At least one warning mentions "timed out"
    const timeoutWarnings = result.warnings.filter(w =>
      w.toLowerCase().includes('timed out')
    );
    expect(timeoutWarnings.length).toBeGreaterThan(0);
  });

  // ── Test 5: suggestedFixes non-empty with HIGH severity vulns ─
  test('suggestions array is non-empty when vulnerabilities has HIGH severity items', async () => {
    setAllAgentsSucceed();

    // Ensure we have a HIGH-severity vulnerability about dependencies
    mockScanVulnerabilities.mockResolvedValue({
      findings: [
        {
          severity: 'HIGH',
          tool: 'npm-audit',
          file: 'package.json',
          issue: 'Critical dependency vulnerability in lodash',
          recommendation: 'Update to latest version',
        },
      ],
      warnings: [],
    });

    const result = await runFullScan(REPO_PATH, SCAN_ID);

    expect(result.status).toBe('completed');
    expect(Array.isArray(result.suggestedFixes)).toBe(true);
    expect(result.suggestedFixes.length).toBeGreaterThan(0);

    // At least one fix should reference updating dependencies
    const hasDependencyFix = result.suggestedFixes.some(fix =>
      fix.toLowerCase().includes('update') || fix.toLowerCase().includes('dependency')
    );
    expect(hasDependencyFix).toBe(true);
  });

  // ── Bonus: warnings are deduplicated ──────────────────────────
  test('duplicate warnings are removed', async () => {
    setAllAgentsSucceed();

    // Both vuln and bug scanners return the same warning text
    const duplicateWarning = 'Tool X not available – falling back to pattern scan';
    mockScanVulnerabilities.mockResolvedValue({
      findings: [],
      warnings: [duplicateWarning, duplicateWarning],
    });
    mockScanBugs.mockResolvedValue({
      findings: [],
      warnings: [duplicateWarning],
    });

    const result = await runFullScan(REPO_PATH, SCAN_ID);

    // The duplicate warning should appear at most once
    const occurrences = result.warnings.filter(w => w === duplicateWarning);
    expect(occurrences.length).toBeLessThanOrEqual(1);
  });

  // ── Per-agent failure isolation tests ──────────────────────────
  // Each test fails exactly ONE agent and proves the scan still completes.

  describe('individual agent failure – scan still completes with warning', () => {

    test('repoAnalyzerAgent fails – uses fallback metadata, adds warning', async () => {
      setAllAgentsSucceed();
      mockAnalyzeRepo.mockRejectedValue(new Error('disk full'));

      const result = await runFullScan(REPO_PATH, SCAN_ID);

      expect(result.status).toBe('completed');

      // Fallback metadata is used
      expect(result.repoMetadata.name).toBe('unknown-repo');
      expect(result.repoMetadata.languages).toEqual(['Unknown']);
      expect(result.repoMetadata.fileCount).toBe(0);

      // Warning references the agent
      expect(result.warnings.some(w => w.includes('Repository Analysis'))).toBe(true);

      // Other agents still called & populated
      expect(result.readme).toEqual(fakeReadme);
      expect(result.reportMarkdown).toBe(fakeReport);
    });

    test('readmeGeneratorAgent fails – uses placeholder README, adds warning', async () => {
      setAllAgentsSucceed();
      mockGenerateReadme.mockRejectedValue(new Error('template error'));

      const result = await runFullScan(REPO_PATH, SCAN_ID);

      expect(result.status).toBe('completed');

      // Fallback readme
      expect(result.readme.content).toContain('README generation failed');
      expect(result.readme.title).toBe(fakeMetadata.name);

      // Warning references the agent
      expect(result.warnings.some(w => w.includes('README Generation'))).toBe(true);

      // Other fields still populated
      expect(result.repoMetadata).toEqual(fakeMetadata);
      expect(result.vulnerabilities).toEqual(fakeVulnResult.findings);
      expect(result.bugs).toEqual(fakeBugResult.findings);
    });

    test('vulnerabilityScannerAgent fails – vulnerabilities empty, adds warning', async () => {
      setAllAgentsSucceed();
      mockScanVulnerabilities.mockRejectedValue(new Error('semgrep not found'));

      const result = await runFullScan(REPO_PATH, SCAN_ID);

      expect(result.status).toBe('completed');

      // Vulnerabilities fall back to empty array
      expect(result.vulnerabilities).toEqual([]);

      // Warning references the agent
      expect(result.warnings.some(w => w.includes('Vulnerability Scanning'))).toBe(true);

      // Other fields still populated
      expect(result.repoMetadata).toEqual(fakeMetadata);
      expect(result.readme).toEqual(fakeReadme);
      expect(result.bugs).toEqual(fakeBugResult.findings);
    });

    test('bugScannerAgent fails – bugs empty, adds warning', async () => {
      setAllAgentsSucceed();
      mockScanBugs.mockRejectedValue(new Error('eslint crashed'));

      const result = await runFullScan(REPO_PATH, SCAN_ID);

      expect(result.status).toBe('completed');

      // Bugs fall back to empty array
      expect(result.bugs).toEqual([]);

      // Warning references the agent
      expect(result.warnings.some(w => w.includes('Bug Scanning'))).toBe(true);

      // Other fields still populated
      expect(result.repoMetadata).toEqual(fakeMetadata);
      expect(result.readme).toEqual(fakeReadme);
      expect(result.vulnerabilities).toEqual(fakeVulnResult.findings);
    });

    test('reportGeneratorAgent fails – uses fallback report string, adds warning', async () => {
      setAllAgentsSucceed();
      mockGenerateFinalReport.mockRejectedValue(new Error('markdown formatter crashed'));

      const result = await runFullScan(REPO_PATH, SCAN_ID);

      expect(result.status).toBe('completed');

      // Fallback report
      expect(result.reportMarkdown).toContain('Report generation failed');
      expect(result.reportMarkdown).toContain(SCAN_ID);

      // Warning references the agent
      expect(result.warnings.some(w => w.includes('Report Generation'))).toBe(true);

      // Other fields still populated
      expect(result.repoMetadata).toEqual(fakeMetadata);
      expect(result.readme).toEqual(fakeReadme);
      expect(result.vulnerabilities).toEqual(fakeVulnResult.findings);
      expect(result.bugs).toEqual(fakeBugResult.findings);
    });
  });
});
