import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DownloadButton from '../components/DownloadButton';
import * as scanApi from '../api/scanApi';

vi.mock('../api/scanApi');

describe('DownloadButton', () => {
  let createElementSpy: any;
  let clickSpy: any;
  let mockAnchor: HTMLAnchorElement;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    clickSpy = vi.fn();
    mockAnchor = document.createElement('a');
    clickSpy = vi.spyOn(mockAnchor, 'click').mockImplementation(() => {});

    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      if (tagName.toLowerCase() === 'a') {
        return mockAnchor;
      }

      return Document.prototype.createElement.call(document, tagName, options);
    });
    
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders download button', () => {
    render(<DownloadButton scanId="test-scan-123" />);
    
    expect(screen.getByRole('button', { name: /Download markdown report/i })).toBeInTheDocument();
  });

  it('downloads report with correct filename format', async () => {
    const mockBlob = new Blob(['test content'], { type: 'text/markdown' });
    const mockDownloadReport = vi.spyOn(scanApi, 'downloadReport').mockResolvedValue(mockBlob);
    
    render(<DownloadButton scanId="test-scan-123" />);
    
    const button = screen.getByRole('button', { name: /Download markdown report/i });
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(mockDownloadReport).toHaveBeenCalledWith('test-scan-123');
      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });

    // Check that the anchor element has the correct download filename
    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockAnchor.download).toBe('repopilot_test-scan-123_report.md');
  });

  it('shows downloading state while downloading', async () => {
    vi.spyOn(scanApi, 'downloadReport').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(new Blob(['test'])), 100))
    );
    
    render(<DownloadButton scanId="test-scan-123" />);
    
    const button = screen.getByRole('button', { name: /Download markdown report/i });
    await userEvent.click(button);
    
    expect(screen.getByText(/Downloading.../i)).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('shows success state after successful download', async () => {
    const mockBlob = new Blob(['test content'], { type: 'text/markdown' });
    vi.spyOn(scanApi, 'downloadReport').mockResolvedValue(mockBlob);
    
    render(<DownloadButton scanId="test-scan-123" />);
    
    const button = screen.getByRole('button', { name: /Download markdown report/i });
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/Downloaded!/i)).toBeInTheDocument();
    });
  });

  it('calls onError callback on download failure', async () => {
    const mockError = new Error('Download failed');
    vi.spyOn(scanApi, 'downloadReport').mockRejectedValue(mockError);
    const onError = vi.fn();
    
    render(<DownloadButton scanId="test-scan-123" onError={onError} />);
    
    const button = screen.getByRole('button', { name: /Download markdown report/i });
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Failed to download report. Please try again.');
    });
  });

  it('shows alert if no onError callback provided', async () => {
    const mockError = new Error('Download failed');
    vi.spyOn(scanApi, 'downloadReport').mockRejectedValue(mockError);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<DownloadButton scanId="test-scan-123" />);
    
    const button = screen.getByRole('button', { name: /Download markdown report/i });
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to download report. Please try again.');
    });
  });

  it('logs error to console on failure', async () => {
    const mockError = new Error('Download failed');
    vi.spyOn(scanApi, 'downloadReport').mockRejectedValue(mockError);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<DownloadButton scanId="test-scan-123" />);
    
    const button = screen.getByRole('button', { name: /Download markdown report/i });
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Download failed:', mockError);
    });
  });
});

// Made with Bob
