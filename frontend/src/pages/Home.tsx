import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ScanForm from '../components/ScanForm';
import ErrorBanner from '../components/ErrorBanner';
import LoadingProgress from '../components/LoadingProgress';
import { startScan } from '../api/scanApi';
import { ScanPayload } from '../types/scan';

const LAST_SCAN_RESULT_KEY = 'repopilot:lastScanResult';

const featureCards = [
  {
    eyebrow: 'Docs',
    title: 'README Generator',
    copy: 'Produces clean project documentation from detected languages, folders, scripts, and setup hints.',
  },
  {
    eyebrow: 'Security',
    title: 'Security Scanner',
    copy: 'Runs dependency, secret, and static security checks and turns findings into fix guidance.',
  },
  {
    eyebrow: 'Quality',
    title: 'Bug & Quality Analyzer',
    copy: 'Highlights risky patterns, missing tests, lint issues, and practical improvements for maintainers.',
  },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanLabel, setScanLabel] = useState('Scanning Repository');
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);
  const cancelRequestedRef = useRef(false);

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
    } catch (err: unknown) {
      if (cancelRequestedRef.current) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Scan failed. Please try again.';

      if (errorMessage.includes('Rate limit reached')) {
        setRateLimitSeconds(60);
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const displayError =
    error && rateLimitSeconds !== null && rateLimitSeconds > 0
      ? `Rate limit reached. Try again in ${rateLimitSeconds} seconds.`
      : error;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <section className="mb-10 text-center">
            <div className="mb-5 inline-flex items-center rounded-full border border-cyan-600/30 bg-cyan-600/10 px-4 py-2 text-sm font-medium text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200">
              Built with IBM Bob-assisted development
            </div>
            <h1 className="mx-auto mb-5 max-w-5xl text-4xl font-bold leading-tight text-slate-900 dark:text-white sm:text-6xl">
              Turn any repository into documentation, security insights, and actionable fixes.
            </h1>
            <p className="mx-auto max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-xl">
              RepoPilot analyzes public GitHub repos or ZIP uploads, then generates README content,
              vulnerability findings, code quality issues, dependency context, and a downloadable report.
            </p>
          </section>

          {displayError && (
            <div className="mb-6">
              <ErrorBanner
                message={displayError}
                onDismiss={() => {
                  setError(null);
                  setRateLimitSeconds(null);
                }}
              />
            </div>
          )}

          <section className="rounded-lg border border-slate-700 bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
            <ScanForm onSubmit={handleScanSubmit} isLoading={isLoading} />
          </section>

          {isLoading && (
            <div className="mt-6">
              <LoadingProgress label={scanLabel} onCancel={handleCancelScan} />
            </div>
          )}

          <section className="mt-12">
            <h2 className="sr-only">Features</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {featureCards.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-300">
                    {feature.eyebrow}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">How to demo this</h2>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
              <p>
                <span className="font-semibold text-cyan-600 dark:text-cyan-300">Step 1:</span> Paste a public repo
                URL or upload ZIP.
              </p>
              <p>
                <span className="font-semibold text-cyan-600 dark:text-cyan-300">Step 2:</span> Start scan.
              </p>
              <p>
                <span className="font-semibold text-cyan-600 dark:text-cyan-300">Step 3:</span> Review findings and
                download report.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Home;
