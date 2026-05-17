import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsDashboard from './ResultsDashboard';
import { ScanResult } from '../types/scan';

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

describe('ResultsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockScanResult: ScanResult = {
    scanId: 'test-scan-123',
    status: 'completed',
    timestamp: '2026-05-16T00:00:00.000Z',
    repoMetadata: {
      name: 'test-repo',
      languages: ['TypeScript', 'JavaScript'],
      frameworks: ['React'],
      hasDocker: false,
      hasTests: true,
      fileCount: 150,
      totalLines: 1200,
      packageManager: 'npm',
    },
    readme: {
      title: 'Test README',
      content: '# Test README\n\nThis is a test readme.',
    },
    readmeFeedback: {
      score: 90,
      strengths: [],
      improvements: [],
    },
    vulnerabilities: [
      {
        severity: 'HIGH',
        file: 'package.json',
        tool: 'npm audit',
        issue: 'SQL Injection vulnerability',
        recommendation: 'Update to version 4.18.0 or later',
      },
      {
        severity: 'MEDIUM',
        file: 'src/App.tsx',
        tool: 'semgrep',
        issue: 'XSS vulnerability',
        recommendation: 'Sanitize user input',
      },
      {
        severity: 'LOW',
        file: 'package.json',
        tool: 'npm audit',
        issue: 'Outdated dependency',
        recommendation: 'Update to latest version',
      },
    ],
    bugs: [
      {
        severity: 'LOW',
        file: 'src/app.ts',
        tool: 'eslint',
        issue: 'Unused variable',
        recommendation: 'Remove unused variable',
      },
    ],
    suggestedFixes: [
      {
        title: 'Update all dependencies to latest versions',
        description: 'Update dependencies to fix vulnerabilities',
        file: 'package.json',
      },
      {
        title: 'Add input validation',
        description: 'Validate all user inputs',
      },
      {
        title: 'Implement proper error handling',
        description: 'Add try-catch blocks',
        file: 'src/api/client.ts',
      },
    ],
    warnings: ['Missing test coverage', 'No CI/CD configuration found'],
    fullReport: '## Final Report\n\nScan completed successfully.',
  };

  const emptyScanResult: ScanResult = {
    scanId: 'empty-scan-123',
    status: 'completed',
    timestamp: '2026-05-16T00:00:00.000Z',
    repoMetadata: {
      name: 'empty-repo',
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
    readmeFeedback: {
      score: 0,
      strengths: [],
      improvements: [],
    },
    vulnerabilities: [],
    bugs: [],
    suggestedFixes: [],
    warnings: [],
    fullReport: '',
  };

  describe('Rendering', () => {
    it('renders repo name from repoMetadata', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      expect(screen.getByText('test-repo')).toBeInTheDocument();
    });

    it('shows "No vulnerabilities found" when vulnerabilities array is empty', () => {
      render(<ResultsDashboard scanResult={emptyScanResult} />);
      expect(screen.getByText('No vulnerabilities found')).toBeInTheDocument();
    });

    it('shows "No bugs found" when bugs array is empty', () => {
      render(<ResultsDashboard scanResult={emptyScanResult} />);
      expect(screen.getByText('No bugs found')).toBeInTheDocument();
    });

    it('shows "No fixes suggested" when suggestedFixes array is empty', () => {
      render(<ResultsDashboard scanResult={emptyScanResult} />);
      expect(screen.getByText('No fixes suggested')).toBeInTheDocument();
    });

    it('shows "No warnings" when warnings array is empty', () => {
      render(<ResultsDashboard scanResult={emptyScanResult} />);
      expect(screen.getByText('No warnings')).toBeInTheDocument();
    });
  });

  describe('Summary Stats Bar', () => {
    it('displays correct counts in the summary stats bar', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      // Check vulnerability count
      const vulnStats = screen.getAllByText('3');
      expect(vulnStats.length).toBeGreaterThan(0);
      
      // Check bug count
      const bugStats = screen.getAllByText('1');
      expect(bugStats.length).toBeGreaterThan(0);
      
      // Check fixes count
      const fixStats = screen.getAllByText('3');
      expect(fixStats.length).toBeGreaterThan(0);
      
      // Check warnings count
      const warningStats = screen.getAllByText('2');
      expect(warningStats.length).toBeGreaterThan(0);
    });
  });

  describe('Severity Badges', () => {
    it('HIGH severity badge has red Tailwind class', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      const highBadges = screen.getAllByText('HIGH');
      expect(highBadges[0]).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('MEDIUM severity badge has orange Tailwind class', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      const mediumBadges = screen.getAllByText('MEDIUM');
      expect(mediumBadges[0]).toHaveClass('bg-orange-100', 'text-orange-800');
    });

    it('LOW severity badge has yellow Tailwind class', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      const lowBadges = screen.getAllByText('LOW');
      expect(lowBadges[0]).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });

  describe('Sorting', () => {
    it('rows are sorted HIGH before MEDIUM before LOW', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      const severityBadges = screen.getAllByText(/HIGH|MEDIUM|LOW/);
      const vulnBadges = severityBadges.slice(0, 3); // First 3 are vulnerabilities
      
      expect(vulnBadges[0]).toHaveTextContent('HIGH');
      expect(vulnBadges[1]).toHaveTextContent('MEDIUM');
      expect(vulnBadges[2]).toHaveTextContent('LOW');
    });
  });

  describe('Expandable Rows', () => {
    it('clicking a vulnerability row expands the recommendation', async () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      // Find the first vulnerability row
      const vulnTitle = screen.getByText('SQL Injection vulnerability');
      
      // Recommendation should not be visible initially
      expect(screen.queryByText(/Update to version 4.18.0/)).not.toBeInTheDocument();
      
      // Click the row
      fireEvent.click(vulnTitle);
      
      // Recommendation should now be visible
      await waitFor(() => {
        expect(screen.getByText(/Update to version 4.18.0/)).toBeInTheDocument();
      });
    });

    it('clicking a bug row expands the recommendation', async () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      // Find the bug row
      const bugTitle = screen.getByText('Unused variable');
      
      // Recommendation should not be visible initially
      expect(screen.queryByText(/Remove unused variable/)).not.toBeInTheDocument();
      
      // Click the row
      fireEvent.click(bugTitle);
      
      // Recommendation should now be visible
      await waitFor(() => {
        expect(screen.getByText(/Remove unused variable/)).toBeInTheDocument();
      });
    });

    it('clicking an expanded row collapses it', async () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      const vulnTitle = screen.getByText('SQL Injection vulnerability');
      
      // Click to expand
      fireEvent.click(vulnTitle);
      await waitFor(() => {
        expect(screen.getByText(/Update to version 4.18.0/)).toBeInTheDocument();
      });
      
      // Click again to collapse
      fireEvent.click(vulnTitle);
      await waitFor(() => {
        expect(screen.queryByText(/Update to version 4.18.0/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Copy README Button', () => {
    it('copy button copies README markdown to clipboard', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      const copyButton = screen.getByText('Copy Markdown');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(mockScanResult.readme.content);
      });
    });

    it('shows success message after copying', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      const copyButton = screen.getByText('Copy Markdown');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('✓ Copied!')).toBeInTheDocument();
      });
    });
  });

  describe('Download Button', () => {
    it('download button is enabled when scanId is present', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      const downloadButton = screen.getByText('📥 Download Full Report');
      expect(downloadButton).not.toBeDisabled();
      expect(downloadButton).toHaveAttribute('href', '/api/scan/test-scan-123/report');
    });

    it('download button is disabled when scanId is missing', () => {
      const scanResultWithoutId = { ...mockScanResult, scanId: '' };
      render(<ResultsDashboard scanResult={scanResultWithoutId} />);
      
      const downloadButton = screen.getByText('📥 Download Not Available');
      expect(downloadButton).toBeDisabled();
    });
  });

  describe('Tech Stack Display', () => {
    it('displays tech stack badges', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('displays total files count', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('displays package manager', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      expect(screen.getByText('npm')).toBeInTheDocument();
    });

    it('falls back cleanly when package manager is missing', () => {
      const scanResultWithoutPackageManager = {
        ...mockScanResult,
        repoMetadata: {
          ...mockScanResult.repoMetadata,
          packageManager: undefined,
        },
      };

      render(<ResultsDashboard scanResult={scanResultWithoutPackageManager} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    });
  });

  describe('Suggested Fixes', () => {
    it('displays suggested fixes as numbered list with code formatting', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      expect(screen.getByText('Update all dependencies to latest versions')).toBeInTheDocument();
      expect(screen.getByText('Add input validation')).toBeInTheDocument();
      expect(screen.getByText('Implement proper error handling')).toBeInTheDocument();
    });

    it('styles the full suggested fix content as monospace', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);

      const fixTitle = screen.getByText('Update all dependencies to latest versions');
      const fixBlock = fixTitle.closest('div');

      expect(fixBlock).toHaveClass('font-mono', 'bg-slate-50', 'rounded', 'border', 'p-3');
      expect(fixBlock).toHaveTextContent('Update dependencies to fix vulnerabilities');
      expect(fixBlock).toHaveTextContent('File: package.json');
    });
  });

  describe('Warnings Section', () => {
    it('displays warnings in yellow callout', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      expect(screen.getByText('Missing test coverage')).toBeInTheDocument();
      expect(screen.getByText('No CI/CD configuration found')).toBeInTheDocument();
    });
  });

  describe('Final Report', () => {
    it('final report is collapsible', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      const summary = screen.getByText(/Click to expand raw Markdown/);
      expect(summary).toBeInTheDocument();
      
      // Report content should not be visible initially
      expect(screen.queryByText('## Final Report')).not.toBeInTheDocument();
      
      // Click to expand
      fireEvent.click(summary);
      
      // Report content should now be visible
      expect(screen.getByText(/## Final Report/)).toBeInTheDocument();
    });

    it('renders final report from reportMarkdown when present', () => {
      const scanResultWithReportMarkdown = {
        ...mockScanResult,
        reportMarkdown: '## Backend Report\n\nRendered from reportMarkdown.',
        fullReport: '## Legacy Report',
      };

      render(<ResultsDashboard scanResult={scanResultWithReportMarkdown} />);

      fireEvent.click(screen.getByText(/Click to expand raw Markdown/));

      expect(screen.getByText(/## Backend Report/)).toBeInTheDocument();
      expect(screen.queryByText(/## Legacy Report/)).not.toBeInTheDocument();
    });

    it('shows fallback when final report is empty', () => {
      render(<ResultsDashboard scanResult={emptyScanResult} />);

      expect(screen.getByText('No final report available')).toBeInTheDocument();
    });
  });

  describe('Tool Display', () => {
    it('displays tool names for vulnerabilities', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      const npmAuditElements = screen.getAllByText('npm audit');
      expect(npmAuditElements.length).toBeGreaterThan(0);
      expect(screen.getByText('semgrep')).toBeInTheDocument();
    });

    it('displays tool names for bugs', () => {
      render(<ResultsDashboard scanResult={mockScanResult} />);
      
      expect(screen.getByText('eslint')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('renders without crashing on mobile viewport', () => {
      const { container } = render(<ResultsDashboard scanResult={mockScanResult} />);
      expect(container).toBeInTheDocument();
      // Component uses responsive Tailwind classes (sm:, md:, lg:) for mobile support
    });
  });

  describe('Safe Defaults', () => {
    it('handles missing optional fields gracefully', () => {
      const minimalScanResult = {
        scanId: 'minimal-scan-123',
        status: 'completed',
        timestamp: '2026-05-16T00:00:00.000Z',
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
        readmeFeedback: {
          score: 0,
          strengths: [],
          improvements: [],
        },
        vulnerabilities: [],
        bugs: [],
        suggestedFixes: [],
        warnings: [],
        fullReport: '',
      } satisfies ScanResult;
      
      const { container } = render(<ResultsDashboard scanResult={minimalScanResult} />);
      expect(container).toBeInTheDocument();
      expect(screen.getByText('minimal-repo')).toBeInTheDocument();
    });

    it('does not crash when arrays are undefined', () => {
      const scanResultWithUndefined = {
        repoMetadata: {
          name: 'test-repo',
        },
        vulnerabilities: undefined,
        bugs: undefined,
        suggestedFixes: undefined,
        warnings: undefined,
      };
      
      const { container } = render(<ResultsDashboard scanResult={scanResultWithUndefined as unknown as ScanResult} />);
      expect(container).toBeInTheDocument();
    });

    it('optional status, timestamp, and error fields do not crash', () => {
      const scanResultWithOptionalFields = {
        ...mockScanResult,
        status: 'failed',
        timestamp: '',
        completedAt: '2026-05-16T00:01:00.000Z',
        error: 'Scan failed while reading repository metadata',
      } satisfies ScanResult;

      const { container } = render(<ResultsDashboard scanResult={scanResultWithOptionalFields} />);

      expect(container).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
      expect(screen.getByText('2026-05-16T00:01:00.000Z')).toBeInTheDocument();
      expect(screen.getByText('Scan failed while reading repository metadata')).toBeInTheDocument();
      expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    });
  });
});

// Made with Bob
