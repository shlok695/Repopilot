import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScanForm from '../components/ScanForm';

describe('ScanForm', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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
    const submitButton = screen.getByRole('button', { name: /Start repository scan/i });
    
    // Enter invalid URL
    await userEvent.type(input, 'https://gitlab.com/user/repo');
    await userEvent.click(submitButton);
    
    // Should show error
    expect(screen.getByText(/Please enter a valid GitHub repository URL/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits valid GitHub URL', async () => {
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const input = screen.getByPlaceholderText(/https:\/\/github.com/i);
    const submitButton = screen.getByRole('button', { name: /Start repository scan/i });
    
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
      expect(screen.getByRole('status')).toHaveTextContent('Selected: test-repo.zip');
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
      expect(screen.getByText(/Please upload a ZIP file/i)).toBeInTheDocument();
    });
  });

  it('shows mock mode placeholder and helper text when mock mode is active', () => {
    vi.stubEnv('VITE_MOCK_API', 'true');
    const mockOnSubmit = vi.fn();

    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);

    expect(screen.getByPlaceholderText('https://github.com/example/react-dashboard-demo')).toBeInTheDocument();
    expect(screen.getByText(/Mock mode is active/i)).toBeInTheDocument();
    expect(screen.getByText(/Flask\/Python keyword/i)).toBeInTheDocument();
  });

  it('submits ZIP uploads in mock mode', async () => {
    vi.stubEnv('VITE_MOCK_API', 'true');
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);

    const zipButton = screen.getByRole('button', { name: /ZIP Upload/i });
    await userEvent.click(zipButton);

    const file = new File(['content'], 'mock-repo.zip', { type: 'application/zip' });
    const input = screen.getByLabelText(/Upload ZIP File/i);
    await userEvent.upload(input, file);

    await userEvent.click(screen.getByRole('button', { name: /Start repository scan/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      type: 'zip',
      file,
    });
  });

  it('shows validation error for empty GitHub URL', async () => {
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const submitButton = screen.getByRole('button', { name: /Start repository scan/i });
    
    // Submit without entering URL
    await userEvent.click(submitButton);
    
    // Should show error
    expect(screen.getByText(/Please enter a GitHub repository URL/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid GitHub URL format', async () => {
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const input = screen.getByPlaceholderText(/https:\/\/github.com/i);
    const submitButton = screen.getByRole('button', { name: /Start repository scan/i });
    
    // Enter invalid URL
    await userEvent.type(input, 'https://gitlab.com/user/repo');
    await userEvent.click(submitButton);
    
    // Should show error
    expect(screen.getByText(/Please enter a valid GitHub repository URL/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for non-ZIP file upload', async () => {
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
      expect(screen.getByText(/Please upload a ZIP file/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for ZIP file exceeding 25 MB', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    // Switch to ZIP upload
    const zipButton = screen.getByRole('button', { name: /ZIP Upload/i });
    await user.click(zipButton);
    
    // Create a mock file larger than 25 MB
    const largeContent = new Array(26 * 1024 * 1024).fill('a').join('');
    const file = new File([largeContent], 'large-repo.zip', { type: 'application/zip' });
    const input = screen.getByLabelText(/Upload ZIP File/i);
    
    // Upload file
    await user.upload(input, file);
    
    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/ZIP file exceeds 25 MB limit/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Start repository scan/i }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error when submitting without selecting a file', async () => {
    const mockOnSubmit = vi.fn();
    render(<ScanForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    // Switch to ZIP upload
    const zipButton = screen.getByRole('button', { name: /ZIP Upload/i });
    await userEvent.click(zipButton);
    
    // Submit without selecting file
    const submitButton = screen.getByRole('button', { name: /Start repository scan/i });
    await userEvent.click(submitButton);
    
    // Should show error
    expect(screen.getByText(/Please upload a ZIP file/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

});

// Made with Bob
