import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ResultsDashboard from '../components/ResultsDashboard';
import { ScanResult } from '../types/scan';

const createMockScanResult = (overrides?: Partial<ScanResult>): ScanResult => ({
  scanId: 'test-scan-123',
  status: 'completed',
  timestamp: new Date().toISOString(),
  repoMetadata: {
    name: 'test-repo',
    languages: ['TypeScript'],
    frameworks: ['React'],
    hasDocker: false,
    hasTests: true,
    fileCount: 50,
    totalLines: 1000,
  },
  readme: {
    title: 'Test Repo',
    content: '# Test Repo\n\nA test repository',
  },
  vulnerabilities: [],
  bugs: [],
  suggestedFixes: [],
  warnings: [],
  ...overrides,
});

describe('ResultsDashboard - All Clear and Warnings', () => {
  it('should display "All Clear" banner when no vulnerabilities and no bugs', () => {
    const scanResult = createMockScanResult({
      vulnerabilities: [],
      bugs: [],
    });

    render(<ResultsDashboard scanResult={scanResult} />);

    expect(screen.getByText(/All Clear: No vulnerabilities or bugs found/i)).toBeInTheDocument();
  });

  it('should not display "All Clear" banner when vulnerabilities exist', () => {
    const scanResult = createMockScanResult({
      vulnerabilities: [
        {
          severity: 'High',
          tool: 'npm audit',
          file: 'package.json',
          issue: 'Test vulnerability',
          recommendation: 'Fix it',
        },
      ],
      bugs: [],
    });

    render(<ResultsDashboard scanResult={scanResult} />);

    expect(screen.queryByText(/All Clear/i)).not.toBeInTheDocument();
  });

  it('should not display "All Clear" banner when bugs exist', () => {
    const scanResult = createMockScanResult({
      vulnerabilities: [],
      bugs: [
        {
          severity: 'Medium',
          tool: 'eslint',
          file: 'src/app.ts',
          issue: 'Test bug',
          recommendation: 'Fix it',
        },
      ],
    });

    render(<ResultsDashboard scanResult={scanResult} />);

    expect(screen.queryByText(/All Clear/i)).not.toBeInTheDocument();
  });

  it('should not display "All Clear" banner when both vulnerabilities and bugs exist', () => {
    const scanResult = createMockScanResult({
      vulnerabilities: [
        {
          severity: 'High',
          tool: 'npm audit',
          file: 'package.json',
          issue: 'Test vulnerability',
          recommendation: 'Fix it',
        },
      ],
      bugs: [
        {
          severity: 'Medium',
          tool: 'eslint',
          file: 'src/app.ts',
          issue: 'Test bug',
          recommendation: 'Fix it',
        },
      ],
    });

    render(<ResultsDashboard scanResult={scanResult} />);

    expect(screen.queryByText(/All Clear/i)).not.toBeInTheDocument();
  });

  it('should display warnings when warnings array has items', () => {
    const scanResult = createMockScanResult({
      warnings: [
        'Warning 1: Some issue detected',
        'Warning 2: Another issue',
      ],
    });

    render(<ResultsDashboard scanResult={scanResult} />);

    expect(screen.getAllByText('Warnings').length).toBeGreaterThan(0);
    expect(screen.getByText('Warning 1: Some issue detected')).toBeInTheDocument();
    expect(screen.getByText('Warning 2: Another issue')).toBeInTheDocument();
  });

  it('should not display warnings section when warnings array is empty', () => {
    const scanResult = createMockScanResult({
      warnings: [],
    });

    render(<ResultsDashboard scanResult={scanResult} />);

    // WarningBox should not render when empty; the summary stat still shows the Warnings label.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should display both "All Clear" and warnings when appropriate', () => {
    const scanResult = createMockScanResult({
      vulnerabilities: [],
      bugs: [],
      warnings: ['Some warning message'],
    });

    render(<ResultsDashboard scanResult={scanResult} />);

    expect(screen.getByText(/All Clear: No vulnerabilities or bugs found/i)).toBeInTheDocument();
    expect(screen.getAllByText('Warnings').length).toBeGreaterThan(0);
    expect(screen.getByText('Some warning message')).toBeInTheDocument();
  });

  it('should still display README and suggested fixes when showing "All Clear"', () => {
    const scanResult = createMockScanResult({
      vulnerabilities: [],
      bugs: [],
      suggestedFixes: [
        {
          title: 'Improvement suggestion',
          description: 'Add more tests',
        },
      ],
    });

    render(<ResultsDashboard scanResult={scanResult} />);

    expect(screen.getByText(/All Clear/i)).toBeInTheDocument();
    expect(screen.getAllByText('README').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Suggested Fixes').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: 'Suggested Fixes' }));
    expect(screen.getByText('Improvement suggestion')).toBeInTheDocument();
  });
});

// Made with Bob
