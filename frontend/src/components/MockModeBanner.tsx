import React from 'react';

const MockModeBanner: React.FC = () => {
  const isMockMode = import.meta.env.VITE_MOCK_API === 'true';

  if (!isMockMode) {
    return null;
  }

  return (
    <div className="bg-orange-100 border-b border-orange-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <svg
              className="h-5 w-5 text-orange-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-orange-800">
              MOCK MODE: Using sample scan data. Backend is not connected.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockModeBanner;

// Made with Bob