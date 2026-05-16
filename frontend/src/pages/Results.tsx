import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import ResultsDashboard from '../components/ResultsDashboard';
import ErrorBanner from '../components/ErrorBanner';
import { getScanResult } from '../api/scanApi';
import { ScanResult } from '../types/scan';

const Results: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!scanId) {
        setError('No scan ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const result = await getScanResult(scanId);
        setScanResult(result);
        
        // If still scanning, poll for updates
        if (result.status === 'scanning' || result.status === 'pending') {
          setTimeout(fetchResults, 3000);
        } else {
          setIsLoading(false);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || (err.request ? 'Backend is not reachable. Please check the server.' : 'Scan failed. Please try again.'));
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [scanId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {isLoading && !scanResult && (
          <div className="max-w-4xl mx-auto">
            <LoadingSpinner />
          </div>
        )}

        {scanResult && scanResult.status === 'scanning' && (
          <div className="max-w-4xl mx-auto mb-6">
            <LoadingSpinner />
          </div>
        )}

        {scanResult && scanResult.status === 'completed' && (
          <ResultsDashboard scanResult={scanResult} />
        )}

        {scanResult && scanResult.status === 'failed' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Scan Failed</h2>
              <p className="text-red-700">{scanResult.error || 'An unknown error occurred'}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Results;

// Made with Bob
