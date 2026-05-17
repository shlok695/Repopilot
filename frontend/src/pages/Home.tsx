import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ScanForm from '../components/ScanForm';
import ErrorBanner from '../components/ErrorBanner';
import LoadingProgress from '../components/LoadingProgress';
import { startScan } from '../api/scanApi';
import { ScanPayload } from '../types/scan';

const LAST_SCAN_RESULT_KEY = 'repopilot:lastScanResult';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanLabel, setScanLabel] = useState('Scanning Repository');
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);
  const cancelRequestedRef = useRef(false);

  // Rate limit countdown
  useEffect(() => {
    if (rateLimitSeconds === null || rateLimitSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRateLimitSeconds((prev) => {
        if (prev === null || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitSeconds]);

  useEffect(() => {
    if (!isLoading) {
      document.title = 'RepoPilot – Scan';
      return undefined;
    }

    document.title = 'RepoPilot – Scanning...';

    return () => {
      document.title = 'RepoPilot – Scan';
    };
  }, [isLoading, scanLabel]);

  const getLoadingLabel = (payload: ScanPayload) => {
    if (payload.type === 'github' && payload.repoUrl) {
      const urlParts = payload.repoUrl.replace(/\/$/, '').split('/');
      const repo = urlParts.slice(-2).join('/');
      return repo ? `Scanning ${repo}` : 'Scanning Repository';
    }

    return payload.file?.name ? `Scanning ${payload.file.name}` : 'Scanning Repository';
  };

  const handleCancelScan = () => {
    cancelRequestedRef.current = true;
    setIsLoading(false);
    setScanLabel('Scanning Repository');
  };

  const handleScanSubmit = async (payload: ScanPayload) => {
    setError(null);
    setRateLimitSeconds(null);
    cancelRequestedRef.current = false;
    setScanLabel(getLoadingLabel(payload));
    setIsLoading(true);

    try {
      const result = await startScan(payload);
      if (cancelRequestedRef.current) {
        return;
      }

      try {
        localStorage.setItem(LAST_SCAN_RESULT_KEY, JSON.stringify(result));
      } catch (storageError) {
        console.error('Failed to persist last scan result:', storageError);
      }

      navigate(`/results/${result.scanId}`, { state: { scanResult: result } });
    } catch (err: any) {
      if (cancelRequestedRef.current) {
        return;
      }

      const errorMessage = err.message || 'Scan failed. Please try again.';
      
      // Check if it's a rate limit error
      if (errorMessage.includes('Rate limit reached')) {
        setRateLimitSeconds(60);
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Display error message with countdown if rate limited
  const displayError = error && rateLimitSeconds !== null && rateLimitSeconds > 0
    ? `Rate limit reached. Try again in ${rateLimitSeconds} seconds.`
    : error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              RepoPilot 🚀
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 dark:text-gray-200 mb-2 font-semibold">
              Scan any repo. Get a README, security report, and bug analysis in seconds.
            </p>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
              Upload a GitHub repository or ZIP file for instant AI-powered analysis.
            </p>
          </div>

          {/* Error Banner */}
          {displayError && (
            <div className="mb-6">
              <ErrorBanner message={displayError} onDismiss={() => {
                setError(null);
                setRateLimitSeconds(null);
              }} />
            </div>
          )}

          {/* Scan Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
            <ScanForm onSubmit={handleScanSubmit} isLoading={isLoading} />
          </div>

          {isLoading && (
            <div className="mt-6">
              <LoadingProgress label={scanLabel} onCancel={handleCancelScan} />
            </div>
          )}

          {/* Features */}
          <div className="mt-12">
            <h2 className="sr-only">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3" aria-hidden="true">📋</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Auto README</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Generate comprehensive documentation automatically with AI-powered analysis
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3" aria-hidden="true">🛡️</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Security Scan</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Detect vulnerabilities using npm audit, semgrep, gitleaks, and more
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3" aria-hidden="true">🐛</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Bug Detection</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Find code quality issues with eslint, ruff, and pattern analysis
              </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;

// Made with Bob
