import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import ResultsDashboard from '../components/ResultsDashboard';
import ErrorBanner from '../components/ErrorBanner';
import { getScanResult } from '../api/scanApi';
import { ScanResult } from '../types/scan';

const LOCALSTORAGE_KEY = 'repopilot:lastScanResult';

const Results: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    // Set document title
    document.title = 'RepoPilot';

    return () => {
      document.title = 'RepoPilot';
    };
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (!scanId) {
        setError('No scan ID provided');
        setIsLoading(false);
        return;
      }

      // First, check if result was passed via navigation state
      const stateResult = (location.state as any)?.scanResult;
      if (stateResult) {
        setScanResult(stateResult);
        setIsLoading(false);
        // Trigger slide-in animation
        setTimeout(() => setShowDashboard(true), 50);
        return;
      }

      // Second, try to load from localStorage
      try {
        const storedResult = localStorage.getItem(LOCALSTORAGE_KEY);
        if (storedResult) {
          const parsedResult = JSON.parse(storedResult) as ScanResult;
          if (parsedResult.scanId === scanId) {
            setScanResult(parsedResult);
            setIsLoading(false);
            setTimeout(() => setShowDashboard(true), 50);
            return;
          }
        }
      } catch (storageErr) {
        console.warn('Failed to load from localStorage:', storageErr);
      }

      // Finally, fetch from API
      try {
        const result = await getScanResult(scanId);
        setScanResult(result);
        
        // If still scanning, poll for updates
        if (result.status === 'scanning' || result.status === 'pending') {
          setTimeout(fetchResults, 3000);
        } else {
          setIsLoading(false);
          setTimeout(() => setShowDashboard(true), 50);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || (err.request ? 'Backend is not reachable. Please check the server.' : 'Scan failed. Please try again.'));
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [scanId, location.state]);

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
          <div
            className={`transition-all duration-500 ${
              showDashboard
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-6'
            }`}
          >
            <ResultsDashboard scanResult={scanResult} />
          </div>
        )}

        {scanResult && scanResult.status === 'failed' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Scan Failed</h2>
              <p className="text-red-700">{scanResult.error || 'An unknown error occurred'}</p>
            </div>
          </div>
        )}

        {!isLoading && !scanResult && !error && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Scan Result Found</h2>
              <p className="text-gray-600 mb-6">
                No scan result found. Please start a new scan.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                New Scan
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Results;

// Made with Bob
