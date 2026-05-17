import React, { useState, useEffect, useRef } from 'react';

interface LoadingProgressProps {
  label?: string;
  isComplete?: boolean;
  onCancel?: () => void;
}

// Cumulative ms from mount at which each step becomes active.
// Total spread: ~85s — enough to cover the 90s server timeout gracefully.
const STEP_SCHEDULE_MS = [0, 10000, 22000, 44000, 66000, 82000];

// How long (ms) each step "owns" before the next one starts.
// Last step owns the remainder until scan completes.
const stepDuration = (index: number): number => {
  const next = STEP_SCHEDULE_MS[index + 1];
  return next !== undefined ? next - STEP_SCHEDULE_MS[index] : 20000;
};

// Rotating sub-activity lines shown inside each active step.
const STEP_ACTIVITIES: string[][] = [
  [
    'Connecting to repository…',
    'Fetching repository metadata…',
    'Cloning into workspace…',
    'Repository received ✓',
  ],
  [
    'Parsing package manifests…',
    'Mapping dependency tree…',
    'Identifying outdated packages…',
    'Resolving transitive dependencies…',
  ],
  [
    'Running Semgrep ruleset…',
    'Executing Gitleaks scan…',
    'Checking CVE database…',
    'Analyzing secret exposure…',
    'Cross-referencing OWASP patterns…',
  ],
  [
    'Inspecting code complexity…',
    'Detecting anti-patterns…',
    'Scanning for unused imports…',
    'Reviewing error-handling paths…',
    'Flagging risky patterns…',
  ],
  [
    'Drafting README sections…',
    'Compiling scan findings…',
    'Formatting report chapters…',
    'Applying doc structure…',
  ],
  [
    'Finalising report…',
    'Preparing download bundle…',
    'Almost there…',
  ],
];

const ACTIVITY_ROTATE_MS = 2800; // how often the sub-line rotates
const TICK_MS = 120;             // progress-bar update frequency

const steps = [
  { label: 'Repository received',       icon: '01' },
  { label: 'Dependencies detected',     icon: '02' },
  { label: 'Security scan running',     icon: '03' },
  { label: 'Code quality scan running', icon: '04' },
  { label: 'README / report generated', icon: '05' },
  { label: 'Final report ready',        icon: '06' },
];

const LoadingProgress: React.FC<LoadingProgressProps> = ({
  label = 'Scanning Repository',
  isComplete = false,
  onCancel,
}) => {
  const [currentStep, setCurrentStep]     = useState(0);
  const [stepProgress, setStepProgress]   = useState(0);   // 0–100
  const [activityIdx, setActivityIdx]     = useState(0);
  const [warningLevel, setWarningLevel]   = useState<0 | 30 | 60>(0);

  const mountTime     = useRef(Date.now());
  const stepStart     = useRef(Date.now());
  const tickRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const activityRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── main tick: update step and inner progress bar ──────────────────────
  useEffect(() => {
    if (isComplete) {
      setCurrentStep(steps.length - 1);
      setStepProgress(100);
      return;
    }

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - mountTime.current;

      // Determine which step we should be on
      let nextStep = 0;
      for (let i = STEP_SCHEDULE_MS.length - 1; i >= 0; i--) {
        if (elapsed >= STEP_SCHEDULE_MS[i]) {
          nextStep = i;
          break;
        }
      }

      setCurrentStep(prev => {
        if (nextStep !== prev) {
          stepStart.current = Date.now();
          setActivityIdx(0);
          return nextStep;
        }
        return prev;
      });

      // Inner progress bar: fraction of this step's budget consumed
      const stepElapsed = Date.now() - stepStart.current;
      const dur = stepDuration(nextStep);
      // Ease out — progress accelerates at first then slows toward 95%
      const raw = Math.min(stepElapsed / dur, 0.95);
      const eased = 1 - Math.pow(1 - raw, 2); // ease-out-quad capped at 95%
      setStepProgress(Math.round(eased * 100));
    }, TICK_MS);

    // Warning banners
    const slow = setTimeout(() => setWarningLevel(30), 30000);
    const very = setTimeout(() => setWarningLevel(60), 60000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      clearTimeout(slow);
      clearTimeout(very);
    };
  }, [isComplete]);

  // ── activity text rotation ─────────────────────────────────────────────
  useEffect(() => {
    if (isComplete) return;

    activityRef.current = setInterval(() => {
      setActivityIdx(prev => {
        const pool = STEP_ACTIVITIES[currentStep] ?? [];
        return pool.length > 1 ? (prev + 1) % pool.length : 0;
      });
    }, ACTIVITY_ROTATE_MS);

    return () => {
      if (activityRef.current) clearInterval(activityRef.current);
    };
  }, [isComplete, currentStep]);

  const isStepComplete = (i: number) => isComplete || i < currentStep;
  const isStepActive   = (i: number) => !isComplete && i === currentStep;

  const activityText = (STEP_ACTIVITIES[currentStep] ?? [])[activityIdx] ?? '';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        {isComplete ? (
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700 mb-4">
            ✓
          </div>
        ) : (
          <div className="relative inline-block mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-700 border-t-cyan-500" />
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isComplete ? 'Scan Complete' : label}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {isComplete ? 'All scan steps are complete.' : 'This may take a few moments…'}
        </p>
      </div>

      {/* Warning banner */}
      {warningLevel > 0 && !isComplete && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                {warningLevel >= 60 ? 'Still scanning' : 'Large repository detected'}
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                {warningLevel >= 60
                  ? 'This scan is still running. Try a smaller repository if it times out.'
                  : 'This scan is taking longer than usual. Please be patient.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step tiles */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            data-testid={`loading-step-${index}`}
            className={`rounded-lg border-2 transition-all duration-500 overflow-hidden ${
              isStepActive(index)
                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 shadow-sm'
                : isStepComplete(index)
                ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800'
            }`}
          >
            <div className="flex items-center p-4">
              {/* Step number badge */}
              <span
                className={`mr-4 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300 ${
                  isStepActive(index)
                    ? 'bg-cyan-600 text-white animate-pulse'
                    : isStepComplete(index)
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {step.icon}
              </span>

              {/* Label + activity text */}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium leading-tight ${
                    isStepActive(index)
                      ? 'text-cyan-900 dark:text-cyan-200'
                      : isStepComplete(index)
                      ? 'text-green-900 dark:text-green-200'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {step.label}
                </p>
                {isStepActive(index) && (
                  <p
                    key={activityText}
                    className="mt-0.5 text-xs text-cyan-600 dark:text-cyan-400 animate-pulse truncate"
                  >
                    {activityText}
                  </p>
                )}
              </div>

              {/* Right-side indicator */}
              <div className="ml-3 shrink-0">
                {isStepComplete(index) && (
                  <span className="text-green-600 text-xl">✓</span>
                )}
                {isStepActive(index) && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600" />
                )}
              </div>
            </div>

            {/* Inner progress bar — only on the active step */}
            {isStepActive(index) && (
              <div className="h-1 bg-cyan-100 dark:bg-cyan-900/30">
                <div
                  className="h-full bg-cyan-500 transition-all duration-150 ease-out"
                  style={{ width: `${stepProgress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step counter */}
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Step {isComplete ? steps.length : currentStep + 1} of {steps.length}</p>
      </div>

      {/* Cancel button */}
      {onCancel && !isComplete && (
        <div className="mt-4 text-center">
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
