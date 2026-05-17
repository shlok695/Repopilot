import { jest } from '@jest/globals';

// Mock reportFormatter
const mockFormatFinalReport = jest.fn();

jest.unstable_mockModule('../middleware/reportFormatter.js', () => ({
  formatFinalReport: mockFormatFinalReport,
}));

const { generateFinalReport } = await import('./reportGeneratorAgent.js');

describe('reportGeneratorAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFinalReport', () => {
    test('should include all section headers in report', async () => {
      const scanResult = {
        scanId: 'scan_123',
        repoMetadata: {
          name: 'test-repo',
          fileCount: 50,
          totalLines: 5000,
          languages: ['JavaScript'],
          frameworks: ['React'],
        },
        readme: {
          title: 'Test Repo',
          content: '# Test Repo\n\nA test repository',
        },
        vulnerabilities: [
          {
            severity: 'HIGH',
            tool: 'npm-audit',
            file: 'package.json',
            issue: 'Vulnerable dependency',
            recommendation: 'Update to latest version',
          },
        ],
        bugs: [
          {
            severity: 'MEDIUM',
            tool: 'eslint',
            file: 'src/app.js',
            issue: 'Unused variable',
            recommendation: 'Remove unused variable',
          },
        ],
        suggestedFixes: [
          'Update vulnerable dependencies',
          'Fix linting errors',
        ],
        warnings: ['Some warnings'],
        timestamp: Date.now(),
      };

      // Mock the formatter to return a report with all sections
      const mockReport = `# RepoPilot Security & Code Quality Report

## 📑 Table of Contents
## 🔍 Scan Metadata
## 📊 Executive Summary
## 📦 Repository Metadata
## 📦 Dependency Inventory
## ⚖️ License Findings
## 🔒 Security Vulnerabilities
## 🐛 Code Quality Issues
## ⚡ Quick Wins
## 💡 Suggested Fixes
## 📝 Auto-Generated README`;

      mockFormatFinalReport.mockReturnValue(mockReport);

      const result = await generateFinalReport(scanResult);

      expect(result.markdown).toBeDefined();
      expect(result.markdown).toContain('# RepoPilot Security & Code Quality Report');
      expect(result.markdown).toContain('## 📑 Table of Contents');
      expect(result.markdown).toContain('## 🔍 Scan Metadata');
      expect(result.markdown).toContain('## 📊 Executive Summary');
      expect(result.markdown).toContain('## 📦 Repository Metadata');
      expect(result.markdown).toContain('## 📦 Dependency Inventory');
      expect(result.markdown).toContain('## ⚖️ License Findings');
      expect(result.markdown).toContain('## 🔒 Security Vulnerabilities');
      expect(result.markdown).toContain('## 🐛 Code Quality Issues');
      expect(result.markdown).toContain('## ⚡ Quick Wins');
      expect(result.markdown).toContain('## 💡 Suggested Fixes');
      expect(result.markdown).toContain('## 📝 Auto-Generated README');
    });

    test('should match HIGH vulnerability count in summary with input', async () => {
      const scanResult = {
        scanId: 'scan_456',
        repoMetadata: { name: 'vuln-repo' },
        readme: { title: 'Vuln Repo', content: '# Vuln Repo' },
        vulnerabilities: [
          { severity: 'CRITICAL', tool: 'npm-audit', file: 'pkg1', issue: 'Critical issue 1', recommendation: 'Fix 1' },
          { severity: 'HIGH', tool: 'npm-audit', file: 'pkg2', issue: 'High issue 1', recommendation: 'Fix 2' },
          { severity: 'HIGH', tool: 'semgrep', file: 'pkg3', issue: 'High issue 2', recommendation: 'Fix 3' },
          { severity: 'MEDIUM', tool: 'npm-audit', file: 'pkg4', issue: 'Medium issue', recommendation: 'Fix 4' },
          { severity: 'LOW', tool: 'npm-audit', file: 'pkg5', issue: 'Low issue', recommendation: 'Fix 5' },
        ],
        bugs: [
          { severity: 'HIGH', tool: 'eslint', file: 'app.js', issue: 'High bug', recommendation: 'Fix bug' },
          { severity: 'MEDIUM', tool: 'eslint', file: 'utils.js', issue: 'Medium bug', recommendation: 'Fix bug' },
        ],
        suggestedFixes: [],
        warnings: [],
        timestamp: Date.now(),
      };

      mockFormatFinalReport.mockReturnValue('# Report');

      const result = await generateFinalReport(scanResult);

      expect(result.summary).toBeDefined();
      expect(result.summary.totalVulns).toBe(5);
      expect(result.summary.criticalVulns).toBe(3); // 1 CRITICAL + 2 HIGH
      expect(result.summary.totalBugs).toBe(2);
      
      // Verify the count matches input
      const inputHighVulns = scanResult.vulnerabilities.filter(v => 
        v.severity === 'HIGH' || v.severity === 'CRITICAL'
      ).length;
      expect(result.summary.criticalVulns).toBe(inputHighVulns);
    });

    test('should have correct overallRecommendation for critical issues', async () => {
      const scanResult = {
        scanId: 'scan_789',
        repoMetadata: { name: 'critical-repo' },
        readme: { title: 'Critical Repo', content: '# Critical' },
        vulnerabilities: [
          { severity: 'CRITICAL', tool: 'npm-audit', file: 'pkg1', issue: 'Critical 1', recommendation: 'Fix' },
          { severity: 'CRITICAL', tool: 'npm-audit', file: 'pkg2', issue: 'Critical 2', recommendation: 'Fix' },
          { severity: 'HIGH', tool: 'npm-audit', file: 'pkg3', issue: 'High 1', recommendation: 'Fix' },
          { severity: 'HIGH', tool: 'npm-audit', file: 'pkg4', issue: 'High 2', recommendation: 'Fix' },
          { severity: 'HIGH', tool: 'npm-audit', file: 'pkg5', issue: 'High 3', recommendation: 'Fix' },
          { severity: 'HIGH', tool: 'npm-audit', file: 'pkg6', issue: 'High 4', recommendation: 'Fix' },
        ],
        bugs: [],
        suggestedFixes: [],
        warnings: [],
        timestamp: Date.now(),
      };

      mockFormatFinalReport.mockReturnValue('# Report');

      const result = await generateFinalReport(scanResult);

      // 6 critical vulnerabilities (CRITICAL + HIGH) should trigger "Immediate action required"
      expect(result.summary.overallRecommendation).toContain('Immediate action required');
      expect(result.summary.criticalVulns).toBe(6);
    });

    test('should have correct overallRecommendation for moderate issues', async () => {
      const scanResult = {
        scanId: 'scan_moderate',
        repoMetadata: { name: 'moderate-repo' },
        readme: { title: 'Moderate', content: '# Moderate' },
        vulnerabilities: [
          { severity: 'HIGH', tool: 'npm-audit', file: 'pkg1', issue: 'High', recommendation: 'Fix' },
          { severity: 'MEDIUM', tool: 'npm-audit', file: 'pkg2', issue: 'Medium 1', recommendation: 'Fix' },
          { severity: 'MEDIUM', tool: 'npm-audit', file: 'pkg3', issue: 'Medium 2', recommendation: 'Fix' },
        ],
        bugs: [],
        suggestedFixes: [],
        warnings: [],
        timestamp: Date.now(),
      };

      mockFormatFinalReport.mockReturnValue('# Report');

      const result = await generateFinalReport(scanResult);

      // 1 critical vuln should trigger "Review before production"
      expect(result.summary.overallRecommendation).toContain('Review before production');
      expect(result.summary.criticalVulns).toBe(1);
    });

    test('should have correct overallRecommendation for many bugs', async () => {
      const scanResult = {
        scanId: 'scan_bugs',
        repoMetadata: { name: 'buggy-repo' },
        readme: { title: 'Buggy', content: '# Buggy' },
        vulnerabilities: [],
        bugs: Array.from({ length: 25 }, (_, i) => ({
          severity: 'MEDIUM',
          tool: 'eslint',
          file: `file${i}.js`,
          issue: `Bug ${i}`,
          recommendation: 'Fix',
        })),
        suggestedFixes: [],
        warnings: [],
        timestamp: Date.now(),
      };

      mockFormatFinalReport.mockReturnValue('# Report');

      const result = await generateFinalReport(scanResult);

      // >20 bugs should trigger "Review recommended"
      expect(result.summary.overallRecommendation).toContain('Review recommended');
      expect(result.summary.totalBugs).toBe(25);
    });

    test('should have correct overallRecommendation for clean repo', async () => {
      const scanResult = {
        scanId: 'scan_clean',
        repoMetadata: { name: 'clean-repo' },
        readme: { title: 'Clean', content: '# Clean' },
        vulnerabilities: [],
        bugs: [],
        suggestedFixes: [],
        warnings: [],
        timestamp: Date.now(),
      };

      mockFormatFinalReport.mockReturnValue('# Report');

      const result = await generateFinalReport(scanResult);

      // No issues should result in "Good shape"
      expect(result.summary.overallRecommendation).toContain('Good shape');
      expect(result.summary.totalVulns).toBe(0);
      expect(result.summary.totalBugs).toBe(0);
      expect(result.summary.criticalVulns).toBe(0);
    });

    test('should include severity breakdown in summary', async () => {
      const scanResult = {
        scanId: 'scan_breakdown',
        repoMetadata: { name: 'test-repo' },
        readme: { title: 'Test', content: '# Test' },
        vulnerabilities: [
          { severity: 'CRITICAL', tool: 'npm-audit', file: 'pkg1', issue: 'Critical', recommendation: 'Fix' },
          { severity: 'HIGH', tool: 'npm-audit', file: 'pkg2', issue: 'High', recommendation: 'Fix' },
          { severity: 'MEDIUM', tool: 'npm-audit', file: 'pkg3', issue: 'Medium', recommendation: 'Fix' },
          { severity: 'LOW', tool: 'npm-audit', file: 'pkg4', issue: 'Low', recommendation: 'Fix' },
        ],
        bugs: [
          { severity: 'HIGH', tool: 'eslint', file: 'app.js', issue: 'High bug', recommendation: 'Fix' },
          { severity: 'MEDIUM', tool: 'eslint', file: 'utils.js', issue: 'Medium bug', recommendation: 'Fix' },
          { severity: 'INFO', tool: 'eslint', file: 'test.js', issue: 'Info', recommendation: 'Fix' },
        ],
        suggestedFixes: [],
        warnings: [],
        timestamp: Date.now(),
      };

      mockFormatFinalReport.mockReturnValue('# Report');

      const result = await generateFinalReport(scanResult);

      expect(result.summary.severityBreakdown).toBeDefined();
      expect(result.summary.severityBreakdown.critical).toBe(1);
      expect(result.summary.severityBreakdown.high).toBe(2); // 1 vuln + 1 bug
      expect(result.summary.severityBreakdown.medium).toBe(2); // 1 vuln + 1 bug
      expect(result.summary.severityBreakdown.low).toBe(1);
      expect(result.summary.severityBreakdown.info).toBe(1);
    });

    test('should include repository info in summary', async () => {
      const scanResult = {
        scanId: 'scan_repo_info',
        repoMetadata: {
          name: 'awesome-project',
          fileCount: 150,
          totalLines: 12500,
          languages: ['TypeScript', 'JavaScript'],
          frameworks: ['React', 'Express'],
        },
        readme: { title: 'Awesome', content: '# Awesome' },
        vulnerabilities: [],
        bugs: [],
        suggestedFixes: [],
        warnings: [],
        timestamp: Date.now(),
      };

      mockFormatFinalReport.mockReturnValue('# Report');

      const result = await generateFinalReport(scanResult);

      expect(result.summary.repository).toBeDefined();
      expect(result.summary.repository.name).toBe('awesome-project');
      expect(result.summary.repository.fileCount).toBe(150);
      expect(result.summary.repository.totalLines).toBe(12500);
      expect(result.summary.repository.languages).toEqual(['TypeScript', 'JavaScript']);
      expect(result.summary.repository.frameworks).toEqual(['React', 'Express']);
    });

    test('should call formatFinalReport with scanResult', async () => {
      const scanResult = {
        scanId: 'scan_call_test',
        repoMetadata: { name: 'test' },
        readme: { title: 'Test', content: '# Test' },
        vulnerabilities: [],
        bugs: [],
        suggestedFixes: [],
        warnings: [],
        timestamp: Date.now(),
      };

      mockFormatFinalReport.mockReturnValue('# Formatted Report');

      await generateFinalReport(scanResult);

      expect(mockFormatFinalReport).toHaveBeenCalledTimes(1);
      expect(mockFormatFinalReport).toHaveBeenCalledWith(scanResult);
    });
  });
});

// Made with Bob
