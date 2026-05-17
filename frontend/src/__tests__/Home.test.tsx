import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import { mockScanResult } from '../api/mockData';
import { startScan } from '../api/scanApi';

vi.mock('../api/scanApi', () => ({
  startScan: vi.fn(),
}));

describe('Home scan flow', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = 'RepoPilot';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.title = 'RepoPilot';
  });

  it('shows loader immediately and hides it after the scan response resolves', async () => {
    let resolveScan: (result: typeof mockScanResult) => void = () => undefined;
    vi.mocked(startScan).mockReturnValue(
      new Promise((resolve) => {
        resolveScan = resolve;
      })
    );

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results/:scanId" element={<div>Results Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/GitHub Repository URL/i), {
      target: { value: 'https://github.com/facebook/react' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Start repository scan/i }));

    expect(screen.getByText(/Scanning facebook\/react/i)).toBeInTheDocument();
    expect(document.title).toBe('RepoPilot – Scanning...');

    resolveScan(mockScanResult);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByText(/Scanning facebook\/react/i)).not.toBeInTheDocument();
    }, { timeout: 1000 });
    expect(screen.getByText('Results Page')).toBeInTheDocument();
    expect(localStorage.getItem('repopilot:lastScanResult')).toBe(JSON.stringify(mockScanResult));
    expect(document.title).toBe('RepoPilot – Scan');
  });
});

// Made with Bob
