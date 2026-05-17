import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Results from '../pages/Results';
import { mockScanResult } from '../api/mockData';
import * as scanApi from '../api/scanApi';

vi.mock('../api/scanApi');

describe('Results page', () => {
  it('renders the completed scan dashboard', async () => {
    vi.spyOn(scanApi, 'getScanResult').mockResolvedValue(mockScanResult);

    render(
      <MemoryRouter initialEntries={['/results/scan_1234567890_abcd']}>
        <Routes>
          <Route path="/results/:scanId" element={<Results />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: mockScanResult.repoMetadata.name })).toBeInTheDocument();
    expect(screen.getByText('Total Vulns')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'README' }));
    expect(screen.getByRole('heading', { name: /README/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Vulnerabilities' }));
    expect(screen.getByRole('heading', { name: /Vulnerabilities/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Bugs' }));
    expect(screen.getByRole('heading', { name: /Bugs/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Suggested Fixes' }));
    expect(screen.getByRole('heading', { name: /Suggested Fixes/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Full Report' }));
    expect(screen.getByRole('heading', { name: /Final Report/i })).toBeInTheDocument();
    expect(document.title).toBe('RepoPilot – Results');
  });
});

// Made with Bob
