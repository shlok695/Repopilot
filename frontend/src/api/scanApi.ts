import axios, { AxiosError } from 'axios';
import { ScanResult, ScanPayload } from '../types/scan';
import { mockReactResult, mockFlaskResult } from './mockData';

const BASE = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCK = import.meta.env.VITE_MOCK_API === 'true';
const MOCK_ERROR = import.meta.env.VITE_MOCK_ERROR === 'true';

const apiClient = axios.create({
  baseURL: BASE,
  timeout: 120000, // 2 minutes
  headers: {
    'Content-Type': 'application/json',
  },
});

const PRIVATE_REPO_MESSAGE =
  'This repository appears to be private or unavailable. Please use a public GitHub repository or upload a ZIP file instead.';

const ZIP_TOO_LARGE_MESSAGE = 'ZIP file is too large. Please upload a file smaller than 100 MB.';

const isPrivateOrUnavailableRepoError = (message?: string, status?: number): boolean => {
  const text = (message || '').toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    text.includes('authentication') ||
    text.includes('repository not found') ||
    text.includes('not found') ||
    text.includes('clone failed') ||
    text.includes('permission denied') ||
    text.includes('inaccessible') ||
    text.includes('private')
  );
};

// Centralized error handler
export const handleApiError = (error: unknown): never => {
  console.error('API Error:', error);

  if (!axios.isAxiosError(error)) {
    throw new Error('Unexpected error occurred. Please try again.');
  }

  const axiosError = error as AxiosError<{ message?: string; error?: string; detail?: string }>;

  // Network error - no response from server
  if (!axiosError.response) {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  const status = axiosError.response.status;
  const data = axiosError.response.data;

  // Extract error message from various possible response shapes
  const backendMessage = data?.message || data?.error || data?.detail;

  if (isPrivateOrUnavailableRepoError(backendMessage, status)) {
    throw new Error(PRIVATE_REPO_MESSAGE);
  }

  switch (status) {
    case 400:
      throw new Error(backendMessage || 'Invalid request. Please check your input.');
    case 413:
      throw new Error(ZIP_TOO_LARGE_MESSAGE);
    case 429:
      throw new Error('Rate limit reached. Try again in 60 seconds.');
    case 503:
      throw new Error('Scan timed out. Try a smaller repository.');
    case 500:
      throw new Error('Something went wrong while scanning. Please try a public repository or upload a ZIP file.');
    default:
      throw new Error('Scan failed. Please try again.');
  }
};

// Simulate delay for mock API
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Determine which mock result to return based on payload
const selectMockResult = (payload: ScanPayload): ScanResult => {
  if (payload.type === 'github' && payload.repoUrl) {
    const url = payload.repoUrl.toLowerCase();

    // Return Flask/Python mock if URL contains python, flask, or api keywords
    if (url.includes('python') || url.includes('flask') || url.includes('api')) {
      return {
        ...mockFlaskResult,
        scanId: `mock_scan_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Default to React mock result
  return {
    ...mockReactResult,
    scanId: `mock_scan_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
};

const unwrapScanResult = (data: ScanResult | { result: ScanResult }): ScanResult => {
  return 'result' in data ? data.result : data;
};

export const startScan = async (payload: ScanPayload): Promise<ScanResult> => {
  if (USE_MOCK) {
    await delay(1500);

    // Simulate error if MOCK_ERROR is enabled
    if (MOCK_ERROR) {
      throw new Error('Mock backend error: scan failed. This is a simulated error for testing purposes.');
    }

    return selectMockResult(payload);
  }

  try {
    if (payload.type === 'github') {
      const response = await apiClient.post<ScanResult | { result: ScanResult }>('/api/scan', {
        type: 'github',
        repoUrl: payload.repoUrl,
      });

      return unwrapScanResult(response.data);
    }

    const formData = new FormData();
    formData.append('type', 'zip');

    if (payload.file) {
      formData.append('file', payload.file);
    }

    const response = await apiClient.post<ScanResult | { result: ScanResult }>('/api/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return unwrapScanResult(response.data);
  } catch (error) {
    return handleApiError(error);
  }
};

export const getScanResult = async (scanId: string): Promise<ScanResult> => {
  if (USE_MOCK) {
    await delay(500);

    // Return mock result with the requested scanId
    const mockResult = scanId.includes('flask') ? mockFlaskResult : mockReactResult;

    return {
      ...mockResult,
      scanId,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const response = await apiClient.get<ScanResult | { result: ScanResult }>(`/api/scan/${scanId}`);

    return unwrapScanResult(response.data);
  } catch (error) {
    return handleApiError(error);
  }
};

// Backend contract for real report downloads:
// GET /api/scan/:scanId/report should return Markdown bytes with
// Content-Type: text/markdown or application/octet-stream and
// Content-Disposition: attachment; filename="repopilot_{scanId}_report.md".
// The frontend still sets the browser download filename to
// repopilot_${scanId}_report.md when saving the Blob.
export const downloadReport = async (scanId: string): Promise<Blob> => {
  if (USE_MOCK) {
    await delay(500);

    // Determine which mock report to use
    const mockResult = scanId.includes('flask') ? mockFlaskResult : mockReactResult;
    const reportContent =
      mockResult.fullReport ||
      mockResult.reportMarkdown ||
      `# RepoPilot Scan Report\n\nScan ID: ${scanId}\n\nThis is a mock report.`;

    return new Blob([reportContent], { type: 'text/markdown' });
  }

  try {
    const response = await apiClient.get(`/api/scan/${scanId}/report`, {
      responseType: 'blob',
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getRecentScans = async () => {
  if (USE_MOCK) {
    await delay(300);
    return [];
  }

  try {
    const response = await apiClient.get('/api/scans');

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Export types for convenience
export type { ScanResult, ScanPayload, Vulnerability, Bug, SuggestedFix } from '../types/scan';

// Made with Bob
