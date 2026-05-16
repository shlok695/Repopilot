import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DownloadButton from '../components/DownloadButton';
import * as scanApi from '../api/scanApi';

vi.mock('../api/scanApi');

describe('DownloadButton', () => {
  it('renders download button', () => {
    render(<DownloadButton scanId="test-scan-123" />);
    
    expect(screen.getByRole('button', { name: /Download Report/i })).toBeInTheDocument();
  });

  it('calls download function on click', async () => {
    const mockDownloadReport = vi.spyOn(scanApi, 'downloadReport').mockResolvedValue(
      new Blob(['test content'], { type: 'text/markdown' })
    );
    
    render(<DownloadButton scanId="test-scan-123" />);
    
    const button = screen.getByRole('button', { name: /Download Report/i });
    await userEvent.click(button);
    
    expect(mockDownloadReport).toHaveBeenCalledWith('test-scan-123');
  });

  it('shows downloading state', async () => {
    vi.spyOn(scanApi, 'downloadReport').mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    
    render(<DownloadButton scanId="test-scan-123" />);
    
    const button = screen.getByRole('button', { name: /Download Report/i });
    await userEvent.click(button);
    
    expect(screen.getByText(/Downloading.../i)).toBeInTheDocument();
  });
});

// Made with Bob