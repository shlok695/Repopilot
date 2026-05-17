import { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../pages/Home';
import * as scanApi from '../api/scanApi';

vi.mock('../api/scanApi');

const renderHome = () => {
  return render(
    <BrowserRouter>
      <Home />
    </BrowserRouter>
  );
};

describe('Home - Rate Limit Countdown', () => {
  const flushPromises = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should display rate limit error with countdown starting at 60 seconds', async () => {
    // Mock API to throw rate limit error
    vi.spyOn(scanApi, 'startScan').mockRejectedValue(
      new Error('Rate limit reached. Try again in 60 seconds.')
    );

    renderHome();

    // Enter valid URL and submit
    const input = screen.getByPlaceholderText(/https:\/\/github.com/i);
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo' } });
    
    const submitButton = screen.getByRole('button', { name: /Start repository scan/i });
    fireEvent.click(submitButton);
    await flushPromises();

    // Should show rate limit error with countdown
    expect(screen.getByText(/Rate limit reached. Try again in 60 seconds/i)).toBeInTheDocument();
  });

  it('should decrement countdown every second', async () => {
    vi.spyOn(scanApi, 'startScan').mockRejectedValue(
      new Error('Rate limit reached. Try again in 60 seconds.')
    );

    renderHome();

    const input = screen.getByPlaceholderText(/https:\/\/github.com/i);
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo' } });
    
    const submitButton = screen.getByRole('button', { name: /Start repository scan/i });
    fireEvent.click(submitButton);
    await flushPromises();

    expect(screen.getByText(/Rate limit reached. Try again in 60 seconds/i)).toBeInTheDocument();

    // Advance timer by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/Rate limit reached. Try again in 59 seconds/i)).toBeInTheDocument();

    // Advance timer by 5 more seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/Rate limit reached. Try again in 54 seconds/i)).toBeInTheDocument();
  });

  it('should clear countdown when error is dismissed', async () => {
    vi.spyOn(scanApi, 'startScan').mockRejectedValue(
      new Error('Rate limit reached. Try again in 60 seconds.')
    );

    renderHome();

    const input = screen.getByPlaceholderText(/https:\/\/github.com/i);
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo' } });
    
    const submitButton = screen.getByRole('button', { name: /Start repository scan/i });
    fireEvent.click(submitButton);
    await flushPromises();

    expect(screen.getByText(/Rate limit reached/i)).toBeInTheDocument();

    // Dismiss error
    const dismissButton = screen.getByRole('button', { name: /Dismiss error/i });
    fireEvent.click(dismissButton);

    // Error should be gone
    expect(screen.queryByText(/Rate limit reached/i)).not.toBeInTheDocument();
  });
});

// Made with Bob
