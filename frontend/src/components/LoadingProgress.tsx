import React, { useState, useEffect } from 'react';

interface LoadingProgressProps {
  repoName?: string;
  onCancel?: () => void;
  completed?: boolean;
}

type StepStatus = 'pending' | 'in-progress' | 'done';

interface ScanStep {
  id: number;
  label: string;
  status: StepStatus;
}

const SCAN_STEPS: Omit<ScanStep, 'status'>[] = [
  { id: 1, label: 'Analyzing repository...' },
  { id: 2, label: 'Generating README...' },
  { id: 3, label: 'Scanning vulnerabilities...' },
  { id: 4, label: 'Detecting bugs...' },
  { id: 5, label: 'Building report...' },
];

const STEP_INTERVAL = 5000; // 5 seconds
const WARNING_30S = 30000; // 30 seconds
const WARNING_60S = 60000; // 60 seconds

const getInitialSteps = (): ScanStep[] =>
  SCAN_STEPS.map((step, index) => ({
    ...step,
    status: index === 0 ? 'in-progress' : 'pending',
  }));

const getCompletedSteps = (): ScanStep[] =>
  SCAN_STEPS.map((step) => ({
    ...step,
    status: 'done',
  }));

export const loadingProgressActions = {
  reloadPage: () => window.location.reload(),
};

const LoadingProgress: React.FC<LoadingProgressProps> = ({ repoName, onCancel, completed = false }) => {
  const [steps, setSteps] = useState<ScanStep[]>(() =>
    completed ? getCompletedSteps() : getInitialSteps()
  );
  const [elapsedTime, setElapsedTime] = useState(0);
  const [show30sWarning, setShow30sWarning] = useState(false);
  const [show60sWarning, setShow60sWarning] = useState(false);

  useEffect(() => {
    if (completed) {
      setSteps(getCompletedSteps());
      return;
    }

    // Timer for elapsed time tracking
    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1000);
    }, 1000);

    // Timer for step progression
    const stepInterval = setInterval(() => {
      setSteps((currentSteps) => {
        const currentInProgressIndex = currentSteps.findIndex(
          (step) => step.status === 'in-progress'
        );

        if (currentInProgressIndex === -1) {
          return currentSteps;
        }

        // Mark current step as done
        const newSteps = [...currentSteps];
        newSteps[currentInProgressIndex].status = 'done';

        // Move to next step if available
        if (currentInProgressIndex < newSteps.length - 1) {
          newSteps[currentInProgressIndex + 1].status = 'in-progress';
        }

        return newSteps;
      });
    }, STEP_INTERVAL);

    return () => {
      clearInterval(timeInterval);
      clearInterval(stepInterval);
    };
  }, [completed]);

  useEffect(() => {
    if (elapsedTime >= WARNING_30S && !show30sWarning) {
      setShow30sWarning(true);
    }
    if (elapsedTime >= WARNING_60S && !show60sWarning) {
      setShow60sWarning(true);
    }
  }, [elapsedTime, show30sWarning, show60sWarning]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      loadingProgressActions.reloadPage();
    }
  };

  const getStepIcon = (status: StepStatus): string => {
    switch (status) {
      case 'done':
        return '✅';
      case 'in-progress':
        return '🔄';
      case 'pending':
        return '⏳';
      default:
        return '⏳';
    }
  };

  const displayRepoName = repoName || 'repository';

  return (
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl mx-auto">
      {/* Header with spinner */}
      <div className="text-center mb-6">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Scanning {displayRepoName}...
        </h2>
        <p className="text-gray-600">This usually takes 15–45 seconds</p>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3 mb-6">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
              step.status === 'in-progress'
                ? 'bg-blue-50 border border-blue-200'
                : step.status === 'done'
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <span className="text-2xl">{getStepIcon(step.status)}</span>
            <span
              className={`text-sm font-medium ${
                step.status === 'in-progress'
                  ? 'text-blue-900'
                  : step.status === 'done'
                  ? 'text-green-900'
                  : 'text-gray-600'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* 30 second warning */}
      {show30sWarning && !show60sWarning && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="text-sm text-yellow-800 font-medium">
            ⚠️ Large repo detected — still working...
          </p>
        </div>
      )}

      {/* 60 second warning */}
      {show60sWarning && (
        <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            ⚠️ This is taking longer than usual. You can wait or cancel.
          </p>
        </div>
      )}

      {/* Cancel Button */}
      <div className="text-center">
        <button
          onClick={handleCancel}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
        >
          Cancel Scan
        </button>
      </div>
    </div>
  );
};

export default LoadingProgress;

// Made with Bob
