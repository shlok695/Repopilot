import React, { useState, useEffect } from 'react';

const LoadingProgress: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const steps = [
    { label: 'Analyzing repository', icon: '🔍' },
    { label: 'Generating README', icon: '📝' },
    { label: 'Scanning vulnerabilities', icon: '🔒' },
    { label: 'Detecting bugs', icon: '🐛' },
    { label: 'Building report', icon: '📊' },
  ];

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 5000);

    const warningTimeout = setTimeout(() => {
      setShowWarning(true);
    }, 30000);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(warningTimeout);
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Scanning Repository</h2>
        <p className="text-gray-600">This may take a few moments...</p>
      </div>

      {showWarning && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-800">Large repository detected</h3>
              <p className="text-sm text-yellow-700">
                This scan is taking longer than usual. Please be patient.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center p-4 rounded-lg transition-all ${
              index === currentStep
                ? 'bg-blue-50 border-2 border-blue-500'
                : index < currentStep
                ? 'bg-green-50 border-2 border-green-500'
                : 'bg-gray-50 border-2 border-gray-200'
            }`}
          >
            <span className="text-3xl mr-4">{step.icon}</span>
            <div className="flex-1">
              <p
                className={`font-medium ${
                  index === currentStep
                    ? 'text-blue-900'
                    : index < currentStep
                    ? 'text-green-900'
                    : 'text-gray-500'
                }`}
              >
                {step.label}
              </p>
            </div>
            {index < currentStep && (
              <span className="text-green-600 text-xl">✓</span>
            )}
            {index === currentStep && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Step {currentStep + 1} of {steps.length}</p>
      </div>
    </div>
  );
};

export default LoadingProgress;

// Made with Bob
