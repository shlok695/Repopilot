import { jest } from '@jest/globals';

const { formatFinalReport } = await import('../reportFormatter.js');

describe('formatFinalReport', () => {
  const baseScanResult = {
    scanId: 'scan_test_123',
    timestamp: '2026-05-16T12:00:00.000Z',
    repoMetadata: {
      name: 'TestRepo',
      languages: ['JavaScript', 'TypeScript'],
      frameworks: ['React', 'Express'],
      hasDocker: true,
      hasTests: true,
      fileCount: 42,
      totalLines: 1500,
    },
    readme: {
      content: '# TestRepo Readme\nThis is a test readme content.',
    },
    vulnerabilities: [],
    bugs: [],
    suggestedFixes: [],
    warnings: [],
  };

  test('contains all required sections', () => {
    const result = formatFinalReport(baseScanResult);

    expect(result).toContain('# RepoPilot Security & Code Quality Report');
    expect(result).toContain('scan_test_123');
    expect(result).toContain('## Executive Summary');
    expect(result).toContain('## Repository Overview');
    expect(result).toContain('## Generated README');
    expect(result).toContain('TestRepo Readme');
    expect(result).toContain('## Security Vulnerabilities');
    expect(result).toContain('## Code Quality Issues');
    expect(result).toContain('## Suggested Fixes');
    expect(result).toContain('## Testing Recommendations');
    expect(result).toContain('## Security Notes');
    expect(result).toContain('## Final Recommendation');
  });

  test('table rows match finding counts', () => {
    const scanResult = {
      ...baseScanResult,
      vulnerabilities: [
        { severity: 'HIGH', tool: 'npm audit', file: 'package.json', issue: 'Vuln 1', recommendation: 'Fix 1' },
        { severity: 'MEDIUM', tool: 'semgrep', file: 'src/app.js', issue: 'Vuln 2', recommendation: 'Fix 2' },
      ],
      bugs: [
        { severity: 'LOW', tool: 'eslint', file: 'src/utils.js', issue: 'Bug 1', recommendation: 'Fix 1' },
      ],
      suggestedFixes: ['Do this', 'Do that'],
      warnings: ['A warning occurred'],
    };

    const result = formatFinalReport(scanResult);

    const vulnMatches = result.match(/\|.*npm audit.*\|/g);
    expect(vulnMatches).toHaveLength(1);

    const vulnMatches2 = result.match(/\|.*semgrep.*\|/g);
    expect(vulnMatches2).toHaveLength(1);

    const bugMatches = result.match(/\|.*eslint.*\|/g);
    expect(bugMatches).toHaveLength(1);

    expect(result).toContain('## Warnings');
    expect(result).toContain('- A warning occurred');
    expect(result).toContain('**Top Findings:**');
  });

  test('HIGH verdict for high-severity input', () => {
    const scanResult = {
      ...baseScanResult,
      vulnerabilities: [
        { severity: 'HIGH', tool: 'npm audit', file: 'package.json', issue: 'Critical Issue', recommendation: 'Fix immediately' },
      ],
    };

    const result = formatFinalReport(scanResult);
    expect(result).toContain('Immediate action required: high or critical security findings should be fixed before production use.');
  });

  test('MEDIUM verdict for medium-severity input', () => {
    const scanResult = {
      ...baseScanResult,
      vulnerabilities: [
        { severity: 'MEDIUM', tool: 'npm audit', file: 'package.json', issue: 'Medium Issue', recommendation: 'Fix soon' },
      ],
    };

    const result = formatFinalReport(scanResult);
    expect(result).toContain('Review before production: medium severity issues should be scheduled before the next release.');
  });

  test('LOW verdict for no high/medium-severity input', () => {
    const scanResult = {
      ...baseScanResult,
      bugs: [
        { severity: 'LOW', tool: 'eslint', file: 'src/utils.js', issue: 'Minor Issue', recommendation: 'Fix later' },
      ],
    };

    const result = formatFinalReport(scanResult);
    expect(result).toContain('Good shape overall: no high-severity findings were detected, but review the suggested improvements.');
  });

  test('testing recommendations correctly map to tech stack', () => {
    const result = formatFinalReport(baseScanResult);
    expect(result).toContain('### React');
    expect(result).toContain('### Express');
    expect(result).toContain('### JavaScript');
    expect(result).toContain('### TypeScript');
    expect(result).toContain('### Docker');
  });

  test('escapes table cells correctly', () => {
    const scanResult = {
      ...baseScanResult,
      vulnerabilities: [
        { severity: 'HIGH', tool: 'tool|with|pipes', file: 'file\nname', issue: 'issue|with|pipe', recommendation: 'rec|with|pipe' },
      ],
    };

    const result = formatFinalReport(scanResult);
    expect(result).toContain('tool\\|with\\|pipes');
    expect(result).toContain('issue\\|with\\|pipe');
    expect(result).toContain('file name');
  });

  test('missing fields fallback gracefully', () => {
    const emptyResult = { scanId: '123' };
    const result = formatFinalReport(emptyResult);

    expect(result).toContain('123');
    expect(result).toContain('Unknown');
    expect(result).toContain('_No README was generated for this repository._');
    expect(result).toContain('No vulnerabilities detected.');
    expect(result).toContain('No code quality issues detected.');
    expect(result).toContain('No fixes needed.');
  });
});
