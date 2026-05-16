import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = 'Scanning Repository' }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{label}</h2>
      <p className="text-gray-600">This may take a few moments...</p>
    </div>
  );
};

export default LoadingSpinner;

// Made with Bob
