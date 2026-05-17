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
    { label: 'Repository received', icon: '01' },
    { label: 'Dependencies detected', icon: '02' },
    { label: 'Security scan running', icon: '03' },
    { label: 'Code quality scan running', icon: '04' },
    { label: 'README/report generated', icon: '05' },
    { label: 'Final report ready', icon: '06' },
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
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-8">
      <div className="text-center mb-8">
        {isComplete ? (
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700 mb-4">
            ✓
          </div>
        ) : (
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mb-4"></div>
        )}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{isComplete ? 'Scan Complete' : label}</h2>
        <p className="text-gray-600 dark:text-gray-300">
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
                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-2 border-cyan-500 shadow-sm'
                : isStepComplete(index)
                ? 'bg-green-50 dark:bg-green-950/30 border-2 border-green-500'
                : 'bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700'
            }`}
          >
            <span className={`mr-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
              isStepActive(index)
                ? 'bg-cyan-600 text-white animate-pulse'
                : isStepComplete(index)
                ? 'bg-green-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}>
              {step.icon}
            </span>
            <div className="flex-1">
              <p
                className={`font-medium ${
                  isStepActive(index)
                    ? 'text-cyan-900 dark:text-cyan-200'
                    : isStepComplete(index)
                    ? 'text-green-900 dark:text-green-200'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.label}
              </p>
            </div>
            {isStepComplete(index) && (
              <span className="text-green-600 text-xl">✓</span>
            )}
            {isStepActive(index) && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600"></div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
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
