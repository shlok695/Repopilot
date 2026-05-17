import axios from 'axios';
import { ScanResult, ScanPayload } from '../types/scan';
import { mockReactResult, mockFlaskResult } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const USE_MOCK = import.meta.env.VITE_MOCK_API === 'true';
const MOCK_ERROR = import.meta.env.VITE_MOCK_ERROR === 'true';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes
  headers: {
    'Content-Type': 'application/json',
  },
});

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

  const response = await apiClient.get<ScanResult | { result: ScanResult }>(`/api/scan/${scanId}`);

  return unwrapScanResult(response.data);
};

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

  const response = await apiClient.get(`/api/scan/${scanId}/report`, {
    responseType: 'blob',
  });

  return response.data;
};

export const getRecentScans = async () => {
  if (USE_MOCK) {
    await delay(300);
    return [];
  }

  const response = await apiClient.get('/api/scans');

  return response.data;
};

// Export types for convenience
export type { ScanResult, ScanPayload, Vulnerability, Bug, SuggestedFix } from '../types/scan';

// Made with Bob
