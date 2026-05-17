import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBanner from '../components/ErrorBanner';

describe('ErrorBanner', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  });

  it('renders error message', () => {
    const mockOnDismiss = vi.fn();
    render(<ErrorBanner message="Test error message" onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
    expect(screen.getByText(/^Error$/i)).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const mockOnDismiss = vi.fn();
    render(<ErrorBanner message="Test error" onDismiss={mockOnDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
    await userEvent.click(dismissButton);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should have proper ARIA role', () => {
    render(<ErrorBanner message="Test error" onDismiss={() => {}} />);
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeInTheDocument();
  });

  it('should display Copy Error button', () => {
    render(<ErrorBanner message="Test error" onDismiss={() => {}} />);
    expect(screen.getByText('Copy Error')).toBeInTheDocument();
  });

  it('should copy error message to clipboard when Copy Error is clicked', async () => {
    const user = userEvent.setup();
    const message = 'Test error message';
    render(<ErrorBanner message={message} onDismiss={() => {}} />);
    
    const copyButton = screen.getByRole('button', { name: /Copy error message/i });
    await user.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText('✓ Copied!')).toBeInTheDocument();
    });
  });

  it('should show "Copied!" feedback after copying', async () => {
    const user = userEvent.setup();
    render(<ErrorBanner message="Test error" onDismiss={() => {}} />);
    
    const copyButton = screen.getByRole('button', { name: /Copy error message/i });
    await user.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText('✓ Copied!')).toBeInTheDocument();
    });
  });

  it('should handle clipboard API failure gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const writeTextMock = vi.fn(() => Promise.reject(new Error('Clipboard error')));
    
    // Mock clipboard failure
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    });

    render(<ErrorBanner message="Test error" onDismiss={() => {}} />);
    
    const copyButton = screen.getByRole('button', { name: /Copy error message/i });
    await user.click(copyButton);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});

// Made with Bob
