import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScanForm from '../components/ScanForm';

describe('ScanForm', () => {
  it('renders GitHub URL input by default', () => {
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    expect(screen.getByLabelText(/GitHub Repository URL/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/https:\/\/github.com/i)).toBeInTheDocument();
  });

  it('toggles between GitHub URL and ZIP upload', async () => {
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    // Initially shows GitHub URL input
    expect(screen.getByLabelText(/GitHub Repository URL/i)).toBeInTheDocument();
    
    // Click ZIP Upload button
    const zipButton = screen.getByRole('button', { name: /ZIP Upload/i });
    await userEvent.click(zipButton);
    
    // Should now show file upload
    expect(screen.getByLabelText(/Upload ZIP File/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/GitHub Repository URL/i)).not.toBeInTheDocument();
  });

  it('shows validation error for invalid GitHub URL', async () => {
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const input = screen.getByPlaceholderText(/https:\/\/github.com/i);
    const submitButton = screen.getByRole('button', { name: /Scan Repository/i });
    
    // Enter invalid URL
    await userEvent.type(input, 'https://gitlab.com/user/repo');
    await userEvent.click(submitButton);
    
    // Should show error
    expect(screen.getByText(/URL must start with https:\/\/github.com/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits valid GitHub URL', async () => {
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const input = screen.getByPlaceholderText(/https:\/\/github.com/i);
    const submitButton = screen.getByRole('button', { name: /Scan Repository/i });
    
    // Enter valid URL
    await userEvent.type(input, 'https://github.com/facebook/react');
    await userEvent.click(submitButton);
    
    // Should call onSubmit
    expect(mockOnSubmit).toHaveBeenCalledWith({
      type: 'github',
      repoUrl: 'https://github.com/facebook/react',
    });
  });

  it('disables submit button when loading', () => {
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={true} />);
    
    const submitButton = screen.getByRole('button', { name: /Scanning.../i });
    expect(submitButton).toBeDisabled();
  });

  it('shows file name after selecting ZIP file', async () => {
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    // Switch to ZIP upload
    const zipButton = screen.getByRole('button', { name: /ZIP Upload/i });
    await userEvent.click(zipButton);
    
    // Create a mock file
    const file = new File(['content'], 'test-repo.zip', { type: 'application/zip' });
    const input = screen.getByLabelText(/Upload ZIP File/i);
    
    // Upload file
    await userEvent.upload(input, file);
    
    // Should show file name
    await waitFor(() => {
      expect(screen.getByText(/Selected: test-repo.zip/i)).toBeInTheDocument();
    });
  });

  it('shows error for non-ZIP file', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    // Switch to ZIP upload
    const zipButton = screen.getByRole('button', { name: /ZIP Upload/i });
    await user.click(zipButton);
    
    // Create a mock non-ZIP file
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/Upload ZIP File/i);
    
    // Upload file
    await user.upload(input, file);
    
    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/Only .zip files are allowed/i)).toBeInTheDocument();
    });
  });
});

// Made with Bob
