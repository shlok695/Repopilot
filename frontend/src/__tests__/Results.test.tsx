import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Results from '../pages/Results';
import { mockScanResult } from '../api/mockData';
import * as scanApi from '../api/scanApi';

vi.mock('../api/scanApi');

describe('Results page', () => {
  it('renders all 6 tabs', async () => {
    vi.spyOn(scanApi, 'getScanResult').mockResolvedValue(mockScanResult);

    render(
      <MemoryRouter initialEntries={['/results/scan_1234567890_abcd']}>
        <Routes>
          <Route path="/results/:scanId" element={<Results />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /README/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vulnerabilities/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bugs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Suggested Fixes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Full Report/i })).toBeInTheDocument();
  });
});

// Made with Bob
