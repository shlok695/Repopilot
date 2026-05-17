import { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('App - Global Unhandled Rejection Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/repopilot/');
  });

  it('should catch unhandled promise rejections and display error', async () => {
    render(<App />);

    // Simulate unhandled promise rejection
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: new Error('Test unhandled rejection'),
    });

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    // Should display global error banner
    await waitFor(() => {
      expect(screen.getByText(/Unexpected error occurred. Please try again/i)).toBeInTheDocument();
    });
  });

  it('should log unhandled rejection to console', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<App />);

    const error = new Error('Test unhandled rejection');
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: error,
    });

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled promise rejection:', error);
    });

    consoleErrorSpy.mockRestore();
  });

  it('should allow dismissing global error banner', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Trigger unhandled rejection
    const error = new Error('Test error');
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: error,
    });

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/Unexpected error occurred/i)).toBeInTheDocument();
    });

    // Dismiss error
    const dismissButton = screen.getByRole('button', { name: /Dismiss error/i });
    await user.click(dismissButton);

    // Error should be gone
    expect(screen.queryByText(/Unexpected error occurred/i)).not.toBeInTheDocument();
  });

  it('should prevent default behavior of unhandled rejection', async () => {
    render(<App />);

    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: new Error('Test error'),
    });

    const preventDefaultSpy = vi.spyOn(rejectionEvent, 'preventDefault');

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  it('should cleanup event listener on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = render(<App />);
    
    // Should have added listener
    expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    
    unmount();
    
    // Should have removed listener
    expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});

// Made with Bob
