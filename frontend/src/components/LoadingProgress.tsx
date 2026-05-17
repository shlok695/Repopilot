import React, { useState, useEffect } from 'react';

interface LoadingProgressProps {
  label?: string;
  isComplete?: boolean;
  onCancel?: () => void;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({
  label = 'Scanning Repository',
  isComplete = false,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [warningLevel, setWarningLevel] = useState<0 | 30 | 60>(0);

  const steps = [
    { label: 'Analyzing repository', icon: '🔍' },
    { label: 'Generating README', icon: '📝' },
    { label: 'Scanning vulnerabilities', icon: '🔒' },
    { label: 'Detecting bugs', icon: '🐛' },
    { label: 'Building report', icon: '📊' },
  ];

  useEffect(() => {
    if (isComplete) {
      setCurrentStep(steps.length - 1);
      return undefined;
    }

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 5000);

    const slowWarningTimeout = setTimeout(() => {
      setWarningLevel(30);
    }, 30000);

    const verySlowWarningTimeout = setTimeout(() => {
      setWarningLevel(60);
    }, 60000);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(slowWarningTimeout);
      clearTimeout(verySlowWarningTimeout);
    };
  }, [isComplete, steps.length]);

  const isStepComplete = (index: number) => isComplete || index < currentStep;
  const isStepActive = (index: number) => !isComplete && index === currentStep;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        {isComplete ? (
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700 mb-4">
            ✓
          </div>
        ) : (
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        )}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{isComplete ? 'Scan Complete' : label}</h2>
        <p className="text-gray-600">
          {isComplete ? 'All scan steps are complete.' : 'This may take a few moments...'}
        </p>
      </div>

      {warningLevel > 0 && !isComplete && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-800">
                {warningLevel >= 60 ? 'Still scanning' : 'Large repository detected'}
              </h3>
              <p className="text-sm text-yellow-700">
                {warningLevel >= 60
                  ? 'This scan is still running. Try a smaller repository if it times out.'
                  : 'This scan is taking longer than usual. Please be patient.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={index}
            data-testid={`loading-step-${index}`}
            className={`flex items-center p-4 rounded-lg transition-all ${
              isStepActive(index)
                ? 'bg-blue-50 border-2 border-blue-500'
                : isStepComplete(index)
                ? 'bg-green-50 border-2 border-green-500'
                : 'bg-gray-50 border-2 border-gray-200'
            }`}
          >
            <span className="text-3xl mr-4">{step.icon}</span>
            <div className="flex-1">
              <p
                className={`font-medium ${
                  isStepActive(index)
                    ? 'text-blue-900'
                    : isStepComplete(index)
                    ? 'text-green-900'
                    : 'text-gray-500'
                }`}
              >
                {step.label}
              </p>
            </div>
            {isStepComplete(index) && (
              <span className="text-green-600 text-xl">✓</span>
            )}
            {isStepActive(index) && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Step {isComplete ? steps.length : currentStep + 1} of {steps.length}</p>
      </div>

      {onCancel && !isComplete && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Cancel Scan
          </button>
        </div>
      )}
    </div>
  );
};

export default LoadingProgress;

// Made with Bob
