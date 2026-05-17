import React, { useState } from 'react';
import { ScanPayload } from '../types/scan';

interface ScanFormProps {
  onSubmit: (payload: ScanPayload) => void;
  isLoading: boolean;
}

const MAX_ZIP_SIZE_MB = 100;
const ZIP_TOO_LARGE_MESSAGE = 'ZIP file is too large. Please upload a file smaller than 100 MB.';

const ScanForm: React.FC<ScanFormProps> = ({ onSubmit, isLoading }) => {
  const [scanType, setScanType] = useState<'github' | 'zip'>('github');
  const [repoUrl, setRepoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [urlError, setUrlError] = useState('');
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const isMockMode = import.meta.env.VITE_MOCK_API === 'true';

  const validateGitHubUrl = (url: string): boolean => {
    // Check if empty
    if (!url || url.trim() === '') {
      setUrlError('Please enter a GitHub repository URL.');
      return false;
    }

    // Check if valid GitHub URL
    if (!url.startsWith('https://github.com/')) {
      setUrlError('Please enter a valid GitHub repository URL.');
      return false;
    }

    setUrlError('');
    return true;
  };

  const validateAndSetFile = (selectedFile?: File) => {
    if (!selectedFile) {
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      setFileError('Please upload a valid .zip file.');
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_ZIP_SIZE_MB * 1024 * 1024) {
      setFileError(ZIP_TOO_LARGE_MESSAGE);
      setFile(null);
      return;
    }

    setFileError('');
    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSetFile(e.target.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isLoading) {
      validateAndSetFile(e.dataTransfer.files?.[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (scanType === 'github') {
      if (!validateGitHubUrl(repoUrl)) {
        return;
      }
      onSubmit({ type: 'github', repoUrl });
    } else {
      if (!file) {
        setFileError('Please upload a ZIP file.');
        return;
      }
      onSubmit({ type: 'zip', file });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Paste a public GitHub repository URL or upload a ZIP file up to 100 MB.
      </p>
      {/* Scan Type Toggle */}
      <div>
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Input Type
          </legend>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => setScanType('github')}
              aria-pressed={scanType === 'github'}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                scanType === 'github'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <div className="text-2xl mb-1" aria-hidden="true">🔗</div>
              <div className="font-medium">GitHub URL</div>
            </button>
            <button
              type="button"
              onClick={() => setScanType('zip')}
              aria-pressed={scanType === 'zip'}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                scanType === 'zip'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <div className="text-2xl mb-1" aria-hidden="true">📦</div>
              <div className="font-medium">ZIP Upload</div>
            </button>
          </div>
        </fieldset>
      </div>

      {/* GitHub URL Input */}
      {scanType === 'github' && (
        <div>
          <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            GitHub Repository URL
          </label>
          <input
            type="text"
            id="repoUrl"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder={
              isMockMode
                ? 'https://github.com/example/react-dashboard-demo'
                : 'https://github.com/username/repository'
            }
            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              urlError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
            }`}
            disabled={isLoading}
            aria-invalid={!!urlError}
            aria-describedby={urlError ? 'url-error' : isMockMode ? 'url-hint-mock' : 'url-hint'}
          />
          {urlError && (
            <p id="url-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{urlError}</p>
          )}
          {isMockMode ? (
            <p id="url-hint-mock" className="mt-2 text-sm text-blue-600 dark:text-blue-400">
              💡 Mock mode is active. Try a React repo URL or use a Flask/Python keyword to see Python mock data.
            </p>
          ) : (
            <p id="url-hint" className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Example: https://github.com/facebook/react
            </p>
          )}
        </div>
      )}

      {/* ZIP File Upload */}
      {scanType === 'zip' && (
        <div>
          <label htmlFor="zipFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload ZIP File
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
              isDragging
                ? 'border-cyan-400 bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-950/40'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                <label
                  htmlFor="zipFile"
                  className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-700 focus-within:ring-blue-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="zipFile"
                    name="zipFile"
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="sr-only"
                    disabled={isLoading}
                    aria-describedby={fileError ? 'file-error' : 'file-hint'}
                    aria-invalid={!!fileError}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p id="file-hint" className="text-xs text-gray-500 dark:text-gray-400">ZIP files up to 100 MB</p>
              {isDragging && (
                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300" role="status">
                  Drop your ZIP file to attach it.
                </p>
              )}
            </div>
          </div>
          {file && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400" role="status">
              ✓ Selected: <span className="font-mono">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          {fileError && (
            <p id="file-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{fileError}</p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
          isLoading
            ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
            : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
        }`}
        aria-label={isLoading ? 'Scanning repository' : 'Start repository scan'}
      >
        {isLoading ? 'Scanning...' : 'Scan Repository'}
      </button>
    </form>
  );
};

export default ScanForm;

// Made with Bob
