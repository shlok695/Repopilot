import React, { useState } from 'react';
import { ScanPayload } from '../types/scan';

interface ScanFormProps {
  onSubmit: (payload: ScanPayload) => void;
  isLoading: boolean;
}

const ScanForm: React.FC<ScanFormProps> = ({ onSubmit, isLoading }) => {
  const [scanType, setScanType] = useState<'github' | 'zip'>('github');
  const [repoUrl, setRepoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [urlError, setUrlError] = useState('');
  const [fileError, setFileError] = useState('');

  const validateGitHubUrl = (url: string): boolean => {
    if (!url.startsWith('https://github.com/')) {
      setUrlError('URL must start with https://github.com/');
      return false;
    }
    setUrlError('');
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.zip')) {
        setFileError('Only .zip files are allowed');
        setFile(null);
        return;
      }
      if (selectedFile.size > 25 * 1024 * 1024) {
        setFileError('File size must be less than 25MB');
        setFile(null);
        return;
      }
      setFileError('');
      setFile(selectedFile);
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
        setFileError('Please select a ZIP file');
        return;
      }
      onSubmit({ type: 'zip', file });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Scan Type Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Input Type
        </label>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setScanType('github')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
              scanType === 'github'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">🔗</div>
            <div className="font-medium">GitHub URL</div>
          </button>
          <button
            type="button"
            onClick={() => setScanType('zip')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
              scanType === 'zip'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-1">📦</div>
            <div className="font-medium">ZIP Upload</div>
          </button>
        </div>
      </div>

      {/* GitHub URL Input */}
      {scanType === 'github' && (
        <div>
          <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Repository URL
          </label>
          <input
            type="text"
            id="repoUrl"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/repository"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              urlError ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {urlError && (
            <p className="mt-2 text-sm text-red-600">{urlError}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Example: https://github.com/facebook/react
          </p>
        </div>
      )}

      {/* ZIP File Upload */}
      {scanType === 'zip' && (
        <div>
          <label htmlFor="zipFile" className="block text-sm font-medium text-gray-700 mb-2">
            Upload ZIP File
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="zipFile"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
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
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">ZIP files up to 25MB</p>
            </div>
          </div>
          {file && (
            <p className="mt-2 text-sm text-green-600">
              ✓ Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          {fileError && (
            <p className="mt-2 text-sm text-red-600">{fileError}</p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isLoading ? 'Scanning...' : 'Scan Repository'}
      </button>
    </form>
  );
};

export default ScanForm;

// Made with Bob
