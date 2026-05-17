import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockReactResult } from '../api/mockData';
import { ScanResult } from '../types/scan';

const { mockApiClient, mockAxiosCreate } = vi.hoisted(() => {
  const mockApiClient = {
    post: vi.fn(),
    get: vi.fn(),
  };

  return {
    mockApiClient,
    mockAxiosCreate: vi.fn(() => mockApiClient),
  };
});

vi.mock('axios', () => ({
  default: {
    create: mockAxiosCreate,
  },
}));

describe('scanApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    mockApiClient.post.mockReset();
    mockApiClient.get.mockReset();
    mockAxiosCreate.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('returns mock scan data when VITE_MOCK_API=true', async () => {
    vi.stubEnv('VITE_MOCK_API', 'true');
    vi.stubEnv('VITE_MOCK_ERROR', 'false');

    const { startScan } = await import('../api/scanApi');
    const scanPromise = startScan({
      type: 'github',
      repoUrl: 'https://github.com/example/react-dashboard-demo',
    });

    await vi.advanceTimersByTimeAsync(1500);
    const result = await scanPromise;

    expect(result.scanId).toBeTruthy();
    expect(result.status).toBe('completed');
    expect(result.repoMetadata).toBeTruthy();
    expect(result.readme).toBeTruthy();
    expect(result.vulnerabilities).toEqual(expect.any(Array));
    expect(result.bugs).toEqual(expect.any(Array));
    expect(result.suggestedFixes).toEqual(expect.any(Array));
    expect(result.warnings).toEqual(expect.any(Array));
    expect(result.reportMarkdown).toBeTruthy();
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it('calls the real backend when VITE_MOCK_API=false', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false');
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test');
    const backendResult: ScanResult = {
      ...mockReactResult,
      scanId: 'real_scan_123',
      repoMetadata: {
        ...mockReactResult.repoMetadata,
        name: 'real-backend-repo',
      },
    };
    mockApiClient.post.mockResolvedValue({ data: backendResult });

    const { startScan } = await import('../api/scanApi');
    const result = await startScan({
      type: 'github',
      repoUrl: 'https://github.com/example/real-backend-repo',
    });

    expect(mockAxiosCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://api.test',
      }),
    );
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/scan', {
      type: 'github',
      repoUrl: 'https://github.com/example/real-backend-repo',
    });
    expect(result.scanId).toBe('real_scan_123');
    expect(result.repoMetadata.name).toBe('real-backend-repo');
    expect(result.scanId).not.toMatch(/^mock_scan_/);
  });

  it('throws a simulated backend error when VITE_MOCK_ERROR=true', async () => {
    vi.stubEnv('VITE_MOCK_API', 'true');
    vi.stubEnv('VITE_MOCK_ERROR', 'true');

    const { startScan } = await import('../api/scanApi');
    const scanPromise = startScan({
      type: 'github',
      repoUrl: 'https://github.com/example/react-dashboard-demo',
    });
    const expectedError = expect(scanPromise).rejects.toThrow(/Mock backend error/i);

    await vi.advanceTimersByTimeAsync(1500);
    await expectedError;
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it('returns the Node.js mock result for ZIP uploads in mock mode', async () => {
    vi.stubEnv('VITE_MOCK_API', 'true');
    vi.stubEnv('VITE_MOCK_ERROR', 'false');

    const { startScan } = await import('../api/scanApi');
    const file = new File(['zip content'], 'repo.zip', { type: 'application/zip' });
    const scanPromise = startScan({ type: 'zip', file });

    await vi.advanceTimersByTimeAsync(1500);
    const result = await scanPromise;

    expect(result.repoMetadata.name).toBe('react-dashboard-demo');
    expect(result.repoMetadata.frameworks).toContain('React');
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });
});

// Made with Bob
