import React, { useState } from 'react';
import { ScanResult } from '../types/scan';
import { downloadReport } from '../api/scanApi';
import { generateHtmlReport } from '../utils/reportExport';
import DownloadButton from './DownloadButton';

interface ShareActionsProps {
  scanResult: ScanResult;
  onError?: (message: string) => void;
}

const ShareActions: React.FC<ShareActionsProps> = ({ scanResult, onError }) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [htmlDownloading, setHtmlDownloading] = useState(false);

  const handleCopyShareLink = async () => {
    try {
      const shareLink = `${window.location.origin}/results/${scanResult.scanId}`;
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy share link:', error);
      if (onError) {
        onError('Failed to copy share link.');
      }
    }
  };

  const handleCopyJson = async () => {
    try {
      const jsonString = JSON.stringify(scanResult, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy JSON:', error);
      if (onError) {
        onError('Failed to copy JSON.');
      }
    }
  };

  const handleViewRawReport = async () => {
    try {
      const blob = await downloadReport(scanResult.scanId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      
      // Clean up after a delay to ensure the tab has opened
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error('Failed to open raw report:', error);
      if (onError) {
        onError('Failed to open raw report.');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = async () => {
    setHtmlDownloading(true);
    try {
      const html = generateHtmlReport(scanResult);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `repopilot_${scanResult.scanId}_report.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download HTML report:', error);
      if (onError) {
        onError('Failed to download HTML report.');
      }
    } finally {
      setHtmlDownloading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 no-print">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Download & Share</h2>
      
      <div className="flex flex-wrap gap-3">
        {/* Download Markdown Report */}
        <DownloadButton scanId={scanResult.scanId} onError={onError} />

        {/* Copy Shareable Link */}
        <button
          onClick={handleCopyShareLink}
          aria-label={linkCopied ? 'Shareable link copied' : 'Copy shareable link to clipboard'}
          className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
            linkCopied
              ? 'bg-green-600 dark:bg-green-500 text-white'
              : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
          }`}
        >
          {linkCopied ? (
            <>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              <span>Copy Shareable Link</span>
            </>
          )}
        </button>

        {/* Copy as JSON */}
        <button
          onClick={handleCopyJson}
          aria-label={jsonCopied ? 'JSON data copied' : 'Copy scan results as JSON'}
          className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
            jsonCopied
              ? 'bg-green-600 dark:bg-green-500 text-white'
              : 'bg-purple-600 dark:bg-purple-500 text-white hover:bg-purple-700 dark:hover:bg-purple-600'
          }`}
        >
          {jsonCopied ? (
            <>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>JSON Copied!</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>Copy as JSON</span>
            </>
          )}
        </button>

        {/* View Raw Report */}
        <button
          onClick={handleViewRawReport}
          aria-label="View raw markdown report in new tab"
          className="flex items-center space-x-2 px-4 py-3 bg-gray-600 dark:bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          <span>View Raw Report</span>
        </button>

        {/* Print */}
        <button
          onClick={handlePrint}
          aria-label="Print scan results"
          className="flex items-center space-x-2 px-4 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
          </svg>
          <span>Print</span>
        </button>

        {/* Download HTML Report */}
        <button
          onClick={handleDownloadHtml}
          disabled={htmlDownloading}
          aria-label={htmlDownloading ? 'Generating HTML report' : 'Download HTML report'}
          className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
            htmlDownloading
              ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
              : 'bg-teal-600 dark:bg-teal-500 text-white hover:bg-teal-700 dark:hover:bg-teal-600'
          }`}
        >
          {htmlDownloading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span>Download HTML Report</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ShareActions;

// Made with Bob