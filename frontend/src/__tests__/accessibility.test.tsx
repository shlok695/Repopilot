import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import Home from '../pages/Home';
import ResultsDashboard from '../components/ResultsDashboard';
import { ScanResult } from '../types/scan';

expect.extend(toHaveNoViolations);

// Mock data for ResultsDashboard
const mockScanResult: ScanResult = {
  scanId: 'test-scan-123',
  status: 'completed',
  timestamp: '2024-01-01T12:00:00Z',
  repoMetadata: {
    name: 'test-repo',
    languages: ['TypeScript', 'JavaScript'],
    frameworks: ['React'],
    fileCount: 50,
    totalLines: 5000,
    hasDocker: false,
    hasTests: true,
  },
  readme: {
    title: 'Test README',
    content: '# Test README\n\nThis is a test repository.',
  },
  readmeFeedback: {
    score: 85,
    strengths: ['Clear structure', 'Good examples'],
    improvements: ['Add installation steps'],
  },
  vulnerabilities: [
    {
      severity: 'High',
      issue: 'Test vulnerability',
      file: 'package.json',
      tool: 'npm audit',
      recommendation: 'Update dependency',
    },
  ],
  bugs: [
    {
      severity: 'Medium',
      issue: 'Test bug',
      file: 'src/test.ts',
      tool: 'eslint',
      recommendation: 'Fix the issue',
    },
  ],
  suggestedFixes: [
    {
      title: 'Update dependencies',
      description: 'Run npm update',
    },
  ],
  warnings: ['Test warning'],
  reportMarkdown: '# Test Report',
};

describe('Accessibility Tests', () => {
  it('Home page should have no accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ResultsDashboard with mock data should have no accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <ResultsDashboard scanResult={mockScanResult} />
      </BrowserRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ResultsDashboard with no vulnerabilities or bugs should have no accessibility violations', async () => {
    const cleanScanResult: ScanResult = {
      ...mockScanResult,
      vulnerabilities: [],
      bugs: [],
    };

    const { container } = render(
      <BrowserRouter>
        <ResultsDashboard scanResult={cleanScanResult} />
      </BrowserRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// Made with Bob