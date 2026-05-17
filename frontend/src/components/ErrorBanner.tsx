import React, { useState, useEffect, useRef } from 'react';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  const [copied, setCopied] = useState(false);
  const clipboard = navigator.clipboard;
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const handleCopyError = async () => {
    try {
      await clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error message:', err);
    }
  };

  return (
    <div
      ref={bannerRef}
      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        <span className="text-2xl mr-3" aria-hidden="true">❌</span>
        <div className="flex-1">
          <h3 className="font-semibold text-red-800 dark:text-red-400 mb-1">Error</h3>
          <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
          <button
            onClick={handleCopyError}
            className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded"
            aria-label="Copy error message to clipboard"
          >
            {copied ? '✓ Copied!' : 'Copy Error'}
          </button>
        </div>
        <button
          onClick={onDismiss}
          className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 transition-colors ml-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded"
          aria-label="Dismiss error (or press Escape)"
          title="Dismiss (Esc)"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ErrorBanner;

// Made with Bob
