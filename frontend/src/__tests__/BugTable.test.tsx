import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BugTable from '../components/BugTable';
import { mockScanResult } from '../api/mockData';

describe('BugTable', () => {
  it('renders each bug row from mock data', () => {
    render(<BugTable bugs={mockScanResult.bugs} />);

    mockScanResult.bugs.forEach((bug) => {
      expect(screen.getAllByText(bug.tool).length).toBeGreaterThan(0);
      expect(screen.getByText(bug.file)).toBeInTheDocument();
      expect(screen.getByText(bug.issue)).toBeInTheDocument();
      expect(screen.getByText(bug.recommendation)).toBeInTheDocument();
    });
  });
});

// Made with Bob
