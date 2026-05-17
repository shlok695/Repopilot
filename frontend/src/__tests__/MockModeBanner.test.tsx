import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MockModeBanner from '../components/MockModeBanner';

describe('MockModeBanner', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders mock mode messaging when mock mode is enabled', () => {
    vi.stubEnv('VITE_MOCK_API', 'true');

    render(<MockModeBanner />);

    expect(screen.getByText(/MOCK MODE/i)).toBeInTheDocument();
    expect(screen.getByText(/sample scan data/i)).toBeInTheDocument();
    expect(screen.getByText(/Backend is not connected/i)).toBeInTheDocument();
  });

  it('does not render when mock mode is disabled', () => {
    vi.stubEnv('VITE_MOCK_API', 'false');

    render(<MockModeBanner />);

    expect(screen.queryByText(/MOCK MODE/i)).not.toBeInTheDocument();
  });
});

// Made with Bob
