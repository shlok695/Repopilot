import { describe, it, expect } from 'vitest';
import { escapeHtml, generateHtmlReport } from '../utils/reportExport';
import { ScanResult } from '../types/scan';

describe('reportExport', () => {
  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(escapeHtml('Test & "quotes" <tag>')).toBe('Test &amp; "quotes" &lt;tag&gt;');
      expect(escapeHtml("It's a test")).toBe("It's a test");
    });

    it('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('handles plain text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('generateHtmlReport', () => {
    const mockScanResult: ScanResult = {
      scanId: 'test-scan-123',
      status: 'completed',
      repoMetadata: {
        name: 'test-repo',
        languages: ['JavaScript', 'TypeScript'],
        frameworks: ['React'],
        hasDocker: true,
        hasTests: true,
        fileCount: 50,
        totalLines: 5000,
        packageManager: 'npm',
      },
      readme: {
        title: 'Test README',
        content: '# Test Project\n\nThis is a test.',
      },
      readmeFeedback: {
        score: 8,
        strengths: ['Clear documentation', 'Good examples'],
        improvements: ['Add installation steps', 'Include API docs'],
      },
      vulnerabilities: [
        {
          severity: 'High',
          tool: 'npm audit',
          file: 'package.json',
          issue: 'Vulnerable dependency',
          recommendation: 'Update to version 2.0.0',
        },
      ],
      bugs: [
        {
          severity: 'Medium',
          tool: 'eslint',
          file: 'src/app.js',
          issue: 'Unused variable',
          recommendation: 'Remove unused variable',
        },
      ],
      suggestedFixes: [
        {
          title: 'Update dependencies',
          description: 'Run npm update to fix vulnerabilities',
          file: 'package.json',
        },
      ],
      warnings: ['Missing test coverage', 'No CI/CD configuration'],
      reportMarkdown: '# Full Report\n\nDetailed analysis...',
      timestamp: '2024-01-01T00:00:00Z',
    };

    it('generates valid HTML document', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
    });

    it('includes repository name in title', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('<title>RepoPilot Report - test-repo</title>');
      expect(html).toContain('test-repo');
    });

    it('includes scan metadata', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('test-scan-123');
      expect(html).toContain('completed');
      expect(html).toContain('2024-01-01T00:00:00Z');
    });

    it('includes vulnerability count and details', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('1'); // vulnerability count
      expect(html).toContain('Vulnerable dependency');
      expect(html).toContain('Update to version 2.0.0');
      expect(html).toContain('high');
    });

    it('includes bug count and details', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('1'); // bug count
      expect(html).toContain('Unused variable');
      expect(html).toContain('Remove unused variable');
      expect(html).toContain('medium');
    });

    it('includes suggested fixes', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('Update dependencies');
      expect(html).toContain('Run npm update to fix vulnerabilities');
      expect(html).toContain('package.json');
    });

    it('includes warnings', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('Missing test coverage');
      expect(html).toContain('No CI/CD configuration');
    });

    it('includes README feedback', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('Score: 8/10');
      expect(html).toContain('Clear documentation');
      expect(html).toContain('Add installation steps');
    });

    it('includes full report markdown', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('# Full Report');
      expect(html).toContain('Detailed analysis...');
    });

    it('escapes HTML in content to prevent XSS', () => {
      const maliciousScanResult: ScanResult = {
        ...mockScanResult,
        repoMetadata: {
          ...mockScanResult.repoMetadata,
          name: '<script>alert("xss")</script>',
        },
        vulnerabilities: [
          {
            severity: 'High',
            tool: 'test',
            file: 'test.js',
            issue: '<img src=x onerror=alert(1)>',
            recommendation: 'Fix it',
          },
        ],
      };

      const html = generateHtmlReport(maliciousScanResult);
      
      // Should not contain raw script tags
      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      
      // Should contain escaped text-node versions instead.
      expect(html).toContain('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).toContain('Score: 8/10');
    });

    it('shows all clear message when no vulnerabilities or bugs', () => {
      const cleanScanResult: ScanResult = {
        ...mockScanResult,
        vulnerabilities: [],
        bugs: [],
      };

      const html = generateHtmlReport(cleanScanResult);
      
      expect(html).toContain('All Clear: No vulnerabilities or bugs found');
    });

    it('handles missing optional fields gracefully', () => {
      const minimalScanResult: ScanResult = {
        scanId: 'minimal-scan',
        status: 'completed',
        repoMetadata: {
          name: 'minimal-repo',
          languages: [],
          frameworks: [],
          hasDocker: false,
          hasTests: false,
          fileCount: 0,
          totalLines: 0,
        },
        readme: {
          title: '',
          content: '',
        },
        vulnerabilities: [],
        bugs: [],
        suggestedFixes: [],
        warnings: [],
        timestamp: '2024-01-01T00:00:00Z',
      };

      const html = generateHtmlReport(minimalScanResult);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('minimal-repo');
      expect(html).toContain('minimal-scan');
    });

    it('includes inline CSS styles', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
      expect(html).toContain('font-family');
      expect(html).toContain('background');
      expect(html).toContain('.container');
    });

    it('includes print media query styles', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('@media print');
    });

    it('includes generation timestamp', () => {
      const html = generateHtmlReport(mockScanResult);
      
      expect(html).toContain('Generated by RepoPilot');
    });

    it('uses fullReport if reportMarkdown is not available', () => {
      const scanResultWithFullReport: ScanResult = {
        ...mockScanResult,
        reportMarkdown: undefined,
        fullReport: '# Alternative Report\n\nUsing fullReport field',
      };

      const html = generateHtmlReport(scanResultWithFullReport);
      
      expect(html).toContain('# Alternative Report');
      expect(html).toContain('Using fullReport field');
    });

    it('handles empty arrays gracefully', () => {
      const emptyScanResult: ScanResult = {
        ...mockScanResult,
        vulnerabilities: [],
        bugs: [],
        suggestedFixes: [],
        warnings: [],
      };

      const html = generateHtmlReport(emptyScanResult);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).not.toContain('Vulnerabilities</h2>');
      expect(html).not.toContain('Bugs</h2>');
      expect(html).not.toContain('Suggested Fixes</h2>');
      expect(html).not.toContain('Warnings</h2>');
    });
  });
});

// Made with Bob
