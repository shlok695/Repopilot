import axios from 'axios';
import { ScanResult, ScanPayload } from '../types/scan';
import { mockScanResult } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const USE_MOCK = import.meta.env.VITE_MOCK_API === 'true';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simulate delay for mock API
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const unwrapScanResult = (data: ScanResult | { result: ScanResult }): ScanResult => {
  return 'result' in data ? data.result : data;
};

export const startScan = async (payload: ScanPayload): Promise<ScanResult> => {
  if (USE_MOCK) {
    await delay(1500);
    return {
      ...mockScanResult,
      scanId: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
  }

  if (payload.type === 'github') {
    const response = await apiClient.post<ScanResult | { result: ScanResult }>('/api/scan', {
      type: 'github',
      repoUrl: payload.repoUrl,
    });
    return unwrapScanResult(response.data);
  } else {
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
  }
};

export const getScanResult = async (scanId: string): Promise<ScanResult> => {
  if (USE_MOCK) {
    await delay(500);
    return mockScanResult;
  }

  const response = await apiClient.get<ScanResult | { result: ScanResult }>(`/api/scan/${scanId}`);
  return unwrapScanResult(response.data);
};

export const downloadReport = async (scanId: string): Promise<Blob> => {
  if (USE_MOCK) {
    await delay(500);
    const mockReport = `# RepoPilot Scan Report\n\nScan ID: ${scanId}\n\nThis is a mock report.`;
    return new Blob([mockReport], { type: 'text/markdown' });
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

// Made with Bob
