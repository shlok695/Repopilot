import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareActions from '../components/ShareActions';
import * as scanApi from '../api/scanApi';
import { mockReactResult } from '../api/mockData';

vi.mock('../api/scanApi');

describe('ShareActions', () => {
  const mockScanResult = mockReactResult;
  let createElementSpy: any;
  let clickSpy: any;
  let mockAnchor: HTMLAnchorElement;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;
  let windowOpenSpy: any;
  let windowPrintSpy: any;
  let clipboardWriteTextSpy: any;

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
    
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    windowPrintSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    
    clipboardWriteTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteTextSpy,
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all share action buttons', () => {
    render(<ShareActions scanResult={mockScanResult} />);
    
    expect(screen.getByText(/Download Full Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Shareable Link/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy as JSON/i)).toBeInTheDocument();
    expect(screen.getByText(/View Raw Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Print/i)).toBeInTheDocument();
    expect(screen.getByText(/Download HTML Report/i)).toBeInTheDocument();
  });

  it('copies shareable link to clipboard', async () => {
    render(<ShareActions scanResult={mockScanResult} />);
    
    const button = screen.getByText(/Copy Shareable Link/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(clipboardWriteTextSpy).toHaveBeenCalledWith(
        `${window.location.origin}/results/${mockScanResult.scanId}`
      );
      expect(screen.getByText(/Link Copied!/i)).toBeInTheDocument();
    });
  });

  it('copies JSON to clipboard', async () => {
    render(<ShareActions scanResult={mockScanResult} />);
    
    const button = screen.getByText(/Copy as JSON/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(clipboardWriteTextSpy).toHaveBeenCalledWith(
        JSON.stringify(mockScanResult, null, 2)
      );
      expect(screen.getByText(/JSON Copied!/i)).toBeInTheDocument();
    });
  });

  it('opens raw report in new tab', async () => {
    const mockBlob = new Blob(['test report'], { type: 'text/markdown' });
    vi.spyOn(scanApi, 'downloadReport').mockResolvedValue(mockBlob);
    
    render(<ShareActions scanResult={mockScanResult} />);
    
    const button = screen.getByText(/View Raw Report/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(scanApi.downloadReport).toHaveBeenCalledWith(mockScanResult.scanId);
      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      expect(windowOpenSpy).toHaveBeenCalledWith('blob:mock-url', '_blank', 'noopener,noreferrer');
    });
  });

  it('calls window.print when print button is clicked', async () => {
    render(<ShareActions scanResult={mockScanResult} />);
    
    const button = screen.getByText(/Print/i);
    await userEvent.click(button);
    
    expect(windowPrintSpy).toHaveBeenCalled();
  });

  it('downloads HTML report with correct filename', async () => {
    render(<ShareActions scanResult={mockScanResult} />);
    
    const button = screen.getByText(/Download HTML Report/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickSpy).toHaveBeenCalled();
    });

    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockAnchor.download).toBe(`repopilot_${mockScanResult.scanId}_report.html`);
  });

  it('keeps the HTML report button usable after creating the report', async () => {
    render(<ShareActions scanResult={mockScanResult} />);
    
    const button = screen.getByRole('button', { name: /Download HTML Report/i });
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
      expect(button).not.toBeDisabled();
    });
  });

  it('calls onError when copy shareable link fails', async () => {
    clipboardWriteTextSpy.mockRejectedValue(new Error('Clipboard error'));
    const onError = vi.fn();
    
    render(<ShareActions scanResult={mockScanResult} onError={onError} />);
    
    const button = screen.getByText(/Copy Shareable Link/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Failed to copy share link.');
    });
  });

  it('calls onError when copy JSON fails', async () => {
    clipboardWriteTextSpy.mockRejectedValue(new Error('Clipboard error'));
    const onError = vi.fn();
    
    render(<ShareActions scanResult={mockScanResult} onError={onError} />);
    
    const button = screen.getByText(/Copy as JSON/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Failed to copy JSON.');
    });
  });

  it('calls onError when view raw report fails', async () => {
    vi.spyOn(scanApi, 'downloadReport').mockRejectedValue(new Error('Download failed'));
    const onError = vi.fn();
    
    render(<ShareActions scanResult={mockScanResult} onError={onError} />);
    
    const button = screen.getByText(/View Raw Report/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Failed to open raw report.');
    });
  });

  it('calls onError when HTML download fails', async () => {
    const onError = vi.fn();
    render(<ShareActions scanResult={mockScanResult} onError={onError} />);

    createElementSpy.mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      if (tagName.toLowerCase() === 'a') {
        throw new Error('DOM error');
      }

      return Document.prototype.createElement.call(document, tagName, options);
    });
    
    const button = screen.getByText(/Download HTML Report/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Failed to download HTML report.');
    });
  });

  it('logs errors to console', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    clipboardWriteTextSpy.mockRejectedValue(new Error('Clipboard error'));
    
    render(<ShareActions scanResult={mockScanResult} />);
    
    const button = screen.getByText(/Copy Shareable Link/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  it('revokes object URL after opening raw report', async () => {
    const mockBlob = new Blob(['test report'], { type: 'text/markdown' });
    vi.spyOn(scanApi, 'downloadReport').mockResolvedValue(mockBlob);
    
    render(<ShareActions scanResult={mockScanResult} />);
    
    const button = screen.getByText(/View Raw Report/i);
    await userEvent.click(button);
    
    // Wait for the timeout to revoke URL
    await waitFor(() => {
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    }, { timeout: 2000 });
  });
});

// Made with Bob
