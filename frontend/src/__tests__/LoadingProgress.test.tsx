import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import LoadingProgress from '../components/LoadingProgress';

describe('LoadingProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders initial loading state', () => {
    render(<LoadingProgress />);

    expect(screen.getByText(/Scanning Repository/i)).toBeInTheDocument();
    expect(screen.getByText(/This may take a few moments/i)).toBeInTheDocument();
    expect(screen.getByText(/Repository received/i)).toBeInTheDocument();
    expect(screen.getByText(/Dependencies detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Security scan running/i)).toBeInTheDocument();
    expect(screen.getByText(/Code quality scan running/i)).toBeInTheDocument();
    expect(screen.getByText(/README\/report generated/i)).toBeInTheDocument();
    expect(screen.getByText(/Final report ready/i)).toBeInTheDocument();
  });

  it('starts with first step active', () => {
    render(<LoadingProgress />);

    const firstStep = screen.getByTestId('loading-step-0');
    expect(firstStep).toHaveClass('bg-cyan-50');
  });

  it('advances progress steps every 5 seconds', () => {
    render(<LoadingProgress />);

    // Initially first step is active
    let firstStep = screen.getByTestId('loading-step-0');
    expect(firstStep).toHaveClass('bg-cyan-50');

    // After 5 seconds, second step should be active
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    firstStep = screen.getByTestId('loading-step-0');
    const secondStep = screen.getByTestId('loading-step-1');
    expect(firstStep).toHaveClass('bg-green-50');
    expect(secondStep).toHaveClass('bg-cyan-50');

    // After another 5 seconds, third step should be active
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const thirdStep = screen.getByTestId('loading-step-2');
    expect(secondStep).toHaveClass('bg-green-50');
    expect(thirdStep).toHaveClass('bg-cyan-50');
  });

  it('shows warning after 30 seconds', () => {
    render(<LoadingProgress />);

    expect(screen.queryByText(/Large repository detected/i)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText(/Large repository detected/i)).toBeInTheDocument();
    expect(screen.getByText(/This scan is taking longer than usual/i)).toBeInTheDocument();
  });

  it('displays step counter', () => {
    render(<LoadingProgress />);

    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();
  });

  it('shows checkmarks for completed steps', () => {
    render(<LoadingProgress />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // First step should have a checkmark
    const firstStep = screen.getByTestId('loading-step-0');
    expect(firstStep?.textContent).toContain('✓');
  });

  it('cleans up timers on unmount', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    
    const { unmount } = render(<LoadingProgress />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    
    clearIntervalSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it('handles rapid mount and unmount without errors', () => {
    const { unmount } = render(<LoadingProgress />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(() => unmount()).not.toThrow();
  });
});

// Made with Bob
