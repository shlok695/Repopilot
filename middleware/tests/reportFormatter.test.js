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

    // 1. Title & Metadata
    expect(result).toContain('# 🛡️ RepoPilot Security & Code Quality Report');
    expect(result).toContain('scan_test_123');
    
    // 2. Executive Summary
    expect(result).toContain('## 📊 Executive Summary');
    
    // 3. Repository Overview
    expect(result).toContain('## 📦 Repository Overview');
    
    // 4. Architecture Diagram
    expect(result).toContain('## 🏗️ Architecture Overview');
    expect(result).toContain('```mermaid');
    
    // 5. Generated README
    expect(result).toContain('## 📝 Generated README');
    expect(result).toContain('TestRepo Readme');
    
    // 6. Vulnerability Findings
    expect(result).toContain('## 🔒 Security Vulnerabilities');
    
    // 7. Bug & Code Quality Findings
    expect(result).toContain('## 🐛 Bug & Code Quality Findings');
    
    // 8. Suggested Fixes
    expect(result).toContain('## 💡 Suggested Fixes');
    
    // 9. Testing Recommendations
    expect(result).toContain('## 🧪 Testing Recommendations');
    
    // 10. Security Notes
    expect(result).toContain('## 🔐 Security Notes');
    
    // 11. Final Recommendation (Warning is conditional, so skip explicit index 11)
    expect(result).toContain('## 🎯 Final Recommendation');
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

    // Vulns table should have 2 finding rows + 2 header rows
    const vulnMatches = result.match(/\|.*npm audit.*\|/g);
    expect(vulnMatches).toHaveLength(1);
    
    const vulnMatches2 = result.match(/\|.*semgrep.*\|/g);
    expect(vulnMatches2).toHaveLength(1);

    // Bugs table should have 1 finding row
    const bugMatches = result.match(/\|.*eslint.*\|/g);
    expect(bugMatches).toHaveLength(1);

    // Warnings should be present
    expect(result).toContain('## ⚠️ Warnings');
    expect(result).toContain('- A warning occurred');
    
    // Executive summary top findings
    expect(result).toContain('**Top Critical Findings:**');
  });

  test('HIGH verdict for high-severity input', () => {
    const scanResult = {
      ...baseScanResult,
      vulnerabilities: [
        { severity: 'HIGH', tool: 'npm audit', file: 'package.json', issue: 'Critical Issue', recommendation: 'Fix immediately' },
      ],
    };

    const result = formatFinalReport(scanResult);
    expect(result).toContain('🔴 **Immediate action required**');
  });

  test('MEDIUM verdict for medium-severity input', () => {
    const scanResult = {
      ...baseScanResult,
      vulnerabilities: [
        { severity: 'MEDIUM', tool: 'npm audit', file: 'package.json', issue: 'Medium Issue', recommendation: 'Fix soon' },
      ],
    };

    const result = formatFinalReport(scanResult);
    expect(result).toContain('🟠 **Review before production**');
  });

  test('LOW verdict for no high/medium-severity input', () => {
    const scanResult = {
      ...baseScanResult,
      bugs: [
        { severity: 'LOW', tool: 'eslint', file: 'src/utils.js', issue: 'Minor Issue', recommendation: 'Fix later' },
      ],
    };

    const result = formatFinalReport(scanResult);
    expect(result).toContain('🟢 **Good shape, minor improvements suggested**');
  });

  test('testing recommendations correctly map to tech stack', () => {
    const result = formatFinalReport(baseScanResult);
    // Based on 'React', 'Express', 'JavaScript', 'TypeScript', 'Docker'
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
    expect(result).toContain('file name'); // newlines replaced by space
  });

  test('missing fields fallback gracefully', () => {
    const emptyResult = { scanId: '123' };
    const result = formatFinalReport(emptyResult);
    
    expect(result).toContain('123');
    expect(result).toContain('Unknown'); // For repo name
    expect(result).toContain('_No README was generated for this repository._');
    expect(result).toContain('✅ No vulnerabilities detected.');
    expect(result).toContain('✨ No code quality issues detected.');
    expect(result).toContain('✅ No fixes needed.');
  });
});
