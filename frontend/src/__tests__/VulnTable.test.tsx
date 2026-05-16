import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VulnTable from '../components/VulnTable';
import { mockScanResult } from '../api/mockData';
import { Vulnerability } from '../types/scan';

describe('VulnTable', () => {
  it('renders empty state when no vulnerabilities', () => {
    render(<VulnTable vulnerabilities={[]} />);
    
    expect(screen.getByText(/No Vulnerabilities Found/i)).toBeInTheDocument();
    expect(screen.getByText(/Great job!/i)).toBeInTheDocument();
  });

  it('renders each vulnerability row from mock data', () => {
    render(<VulnTable vulnerabilities={mockScanResult.vulnerabilities} />);

    mockScanResult.vulnerabilities.forEach((vulnerability) => {
      expect(screen.getByText(vulnerability.severity)).toBeInTheDocument();
      expect(screen.getAllByText(vulnerability.tool).length).toBeGreaterThan(0);
      expect(screen.getAllByText(vulnerability.file).length).toBeGreaterThan(0);
      expect(screen.getByText(vulnerability.issue)).toBeInTheDocument();
      expect(screen.getByText(vulnerability.recommendation)).toBeInTheDocument();
    });
  });

  it('sorts vulnerabilities by severity', () => {
    const vulnerabilities: Vulnerability[] = [
      { severity: 'Low', tool: 'tool1', file: 'file1', issue: 'Low issue', recommendation: 'Fix low' },
      { severity: 'Critical', tool: 'tool2', file: 'file2', issue: 'Critical issue', recommendation: 'Fix critical' },
      { severity: 'Medium', tool: 'tool3', file: 'file3', issue: 'Medium issue', recommendation: 'Fix medium' },
    ];
    
    render(<VulnTable vulnerabilities={vulnerabilities} />);
    
    const rows = screen.getAllByRole('row');
    // First row is header, second should be Critical (highest severity)
    expect(rows[1]).toHaveTextContent(/Critical/i);
  });
});

// Made with Bob
