import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ScanForm from '../components/ScanForm';
import ErrorBanner from '../components/ErrorBanner';
import LoadingProgress from '../components/LoadingProgress';
import { startScan } from '../api/scanApi';
import { ScanPayload } from '../types/scan';

const LOCALSTORAGE_KEY = 'repopilot:lastScanResult';
const COMPLETION_DELAY_MS = 500;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanCompleted, setIsScanCompleted] = useState(false);
  const [repoName, setRepoName] = useState<string>('');

  useEffect(() => {
    // Set initial document title
    document.title = 'RepoPilot';

    return () => {
      // Cleanup: restore title on unmount
      document.title = 'RepoPilot';
    };
  }, []);

  useEffect(() => {
    // Update document title when loading
    if (isLoading) {
      const displayName = repoName || 'repository';
      document.title = `Scanning ${displayName}...`;
    } else {
      document.title = 'RepoPilot';
    }
  }, [isLoading, repoName]);

  const extractRepoName = (payload: ScanPayload): string => {
    if (payload.type === 'github' && payload.repoUrl) {
      // Extract repo name from GitHub URL
      // e.g., https://github.com/facebook/react -> facebook/react
      const match = payload.repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
      return match ? match[1] : 'repository';
    } else if (payload.type === 'zip' && payload.file) {
      // Use ZIP filename without extension
      return payload.file.name.replace(/\.zip$/i, '');
    }
    return 'repository';
  };

  const handleScanSubmit = async (payload: ScanPayload) => {
    setError(null);
    setIsLoading(true);
    setIsScanCompleted(false);
    
    // Extract and set repo name for display
    const extractedName = extractRepoName(payload);
    setRepoName(extractedName);

    try {
      const result = await startScan(payload);
      setIsScanCompleted(true);
      await new Promise((resolve) => setTimeout(resolve, COMPLETION_DELAY_MS));
      setIsLoading(false);
      document.title = 'RepoPilot';
      
      // Save result to localStorage
      try {
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(result));
      } catch (storageErr) {
        console.warn('Failed to save scan result to localStorage:', storageErr);
      }

      // Navigate to results
      navigate(`/results/${result.scanId}`, { state: { scanResult: result } });
    } catch (err: any) {
      setError(err.response?.data?.message || (err.request ? 'Backend is not reachable. Please check the server.' : 'Scan failed. Please try again.'));
      setIsLoading(false);
      setIsScanCompleted(false);
      document.title = 'RepoPilot';
    }
  };

  const handleCancelScan = () => {
    setIsLoading(false);
    setIsScanCompleted(false);
    setRepoName('');
    document.title = 'RepoPilot';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              RepoPilot 🚀
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              AI-powered repository review in seconds.
            </p>
            <p className="text-gray-500">
              Upload a GitHub repository or ZIP file and get README feedback, vulnerability checks, bug insights, and suggested fixes.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6">
              <ErrorBanner message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          {/* Scan Form */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            <ScanForm onSubmit={handleScanSubmit} isLoading={isLoading} />
          </div>

          {isLoading && (
            <div className="mt-6">
              <LoadingProgress
                repoName={repoName}
                onCancel={handleCancelScan}
                completed={isScanCompleted}
              />
            </div>
          )}

          {/* Features */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-lg font-semibold mb-2">Security Scanning</h3>
              <p className="text-gray-600 text-sm">
                Detect vulnerabilities using npm audit, semgrep, gitleaks, and more
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-3xl mb-3">🐛</div>
              <h3 className="text-lg font-semibold mb-2">Bug Detection</h3>
              <p className="text-gray-600 text-sm">
                Find code quality issues with eslint, ruff, and pattern analysis
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="text-lg font-semibold mb-2">Auto README</h3>
              <p className="text-gray-600 text-sm">
                Generate comprehensive documentation automatically
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;

// Made with Bob
