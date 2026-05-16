import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBanner from '../components/ErrorBanner';

describe('ErrorBanner', () => {
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
});

// Made with Bob
