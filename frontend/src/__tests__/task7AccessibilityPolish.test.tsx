import { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from '../App';
import DarkModeToggle from '../components/DarkModeToggle';
import Footer from '../components/Footer';
import ResultsDashboard from '../components/ResultsDashboard';
import Home from '../pages/Home';
import Results from '../pages/Results';
import { mockScanResult } from '../api/mockData';
import { startScan, getScanResult } from '../api/scanApi';

vi.mock('../api/scanApi', () => ({
  startScan: vi.fn(),
  getScanResult: vi.fn(),
}));

describe('Task 7 Accessibility & Polish', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.title = 'RepoPilot';
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.title = 'RepoPilot';
    vi.restoreAllMocks();
  });

  it('dark mode toggle updates document class and repopilot:theme localStorage', async () => {
    render(<DarkModeToggle />);

    await userEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('repopilot:theme')).toBe('dark');

    await userEvent.click(screen.getByRole('button', { name: /switch to light mode/i }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('repopilot:theme')).toBe('light');
  });

  it('footer renders expected hackathon text', () => {
    render(<Footer />);

    expect(screen.getByText('Built at Hackathon 2026 | Powered by RepoPilot')).toBeInTheDocument();
  });

  it('results tabs expose tab roles and selected state', () => {
    render(<ResultsDashboard scanResult={mockScanResult} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking a results tab changes the active tab panel', () => {
    render(<ResultsDashboard scanResult={mockScanResult} />);

    fireEvent.click(screen.getByRole('tab', { name: 'README' }));

    expect(screen.getByRole('tab', { name: 'README' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'README' })).toHaveAttribute('id', 'panel-readme');
    expect(screen.getByRole('heading', { name: 'README' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: mockScanResult.repoMetadata.name })).not.toBeInTheDocument();
  });

  it('vulnerability tables are wrapped for horizontal mobile overflow', () => {
    render(<ResultsDashboard scanResult={mockScanResult} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Vulnerabilities' }));
    const table = screen.getByRole('table');

    expect(table.parentElement).toHaveClass('overflow-x-auto');
  });

  it('page titles use the exact Task 7 strings', async () => {
    vi.mocked(getScanResult).mockResolvedValue(mockScanResult);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results/:scanId" element={<Results />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.title).toBe('RepoPilot – Scan');
    });

    let resolveScan: (result: typeof mockScanResult) => void = () => undefined;
    vi.mocked(startScan).mockReturnValue(
      new Promise((resolve) => {
        resolveScan = resolve;
      })
    );

    await userEvent.type(screen.getByLabelText(/GitHub Repository URL/i), 'https://github.com/facebook/react');
    await userEvent.click(screen.getByRole('button', { name: /Start repository scan/i }));
    expect(document.title).toBe('RepoPilot – Scanning...');

    resolveScan(mockScanResult);
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(document.title).toBe('RepoPilot – Results');
    });
  });

  it('Escape dismisses the global error banner', async () => {
    window.history.pushState({}, '', '/repopilot/');
    render(<App />);

    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: new Error('Task 7 test error'),
    });

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    expect(await screen.findByText(/Unexpected error occurred/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText(/Unexpected error occurred/i)).not.toBeInTheDocument();
    });
  });
});

// Made with Bob
