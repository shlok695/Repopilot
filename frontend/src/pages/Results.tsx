import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingProgress from '../components/LoadingProgress';
import ResultsDashboard from '../components/ResultsDashboard';
import ResultsSkeleton from '../components/ResultsSkeleton';
import ErrorBanner from '../components/ErrorBanner';
import { getScanResult } from '../api/scanApi';
import { ScanResult } from '../types/scan';

const LAST_SCAN_RESULT_KEY = 'repopilot:lastScanResult';

const Results: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const location = useLocation();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const loadSavedScanResult = (): ScanResult | null => {
    try {
      const savedResult = localStorage.getItem(LAST_SCAN_RESULT_KEY);
      return savedResult ? JSON.parse(savedResult) as ScanResult : null;
    } catch (parseError) {
      console.error('Failed to load last scan result:', parseError);
      return null;
    }
  };

  // Update page title based on loading state
  useEffect(() => {
    document.title = 'RepoPilot – Results';

    return () => {
      document.title = 'RepoPilot';
    };
  }, [isLoading, scanResult]);

  useEffect(() => {
    const routeStateResult = (location.state as { scanResult?: ScanResult } | null)?.scanResult;

    if (routeStateResult) {
      setScanResult(routeStateResult);
      setIsLoading(routeStateResult.status === 'scanning' || routeStateResult.status === 'pending');
      
      // Smooth scroll to top when results are loaded
      if (routeStateResult.status === 'completed') {
        setTimeout(() => {
          if (window.scrollTo) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
      }
      return;
    }

    const savedResult = loadSavedScanResult();
    if (savedResult && (!scanId || savedResult.scanId === scanId)) {
      setScanResult(savedResult);
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      if (!scanId) {
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
          // Smooth scroll to top when results complete
          if (result.status === 'completed') {
            setTimeout(() => {
              if (window.scrollTo) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }, 100);
          }
        }
      } catch (err: any) {
        if (savedResult) {
          setScanResult(savedResult);
          setIsLoading(false);
        } else {
          setError(err.message || 'Failed to load scan results. Please try again.');
          setIsLoading(false);
        }
      }
    };

    fetchResults();
  }, [location.state, scanId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8" ref={resultsRef}>
        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {isLoading && !scanResult && (
          <ResultsSkeleton />
        )}

        {scanResult && scanResult.status === 'scanning' && (
          <div className="max-w-4xl mx-auto mb-6">
            <LoadingProgress />
          </div>
        )}

        {!isLoading && !scanResult && !error && (
          <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No scan result available</h1>
            <p className="text-gray-600 dark:text-gray-400">Start a new scan to see repository results here.</p>
          </div>
        )}

        {scanResult && scanResult.status === 'completed' && (
          <ResultsDashboard scanResult={scanResult} />
        )}

        {scanResult && scanResult.status === 'failed' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 dark:text-red-400 mb-2">Scan Failed</h2>
              <p className="text-red-700 dark:text-red-300">{scanResult.error || 'An unknown error occurred'}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Results;

// Made with Bob
