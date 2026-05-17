import React from 'react';

interface WarningBoxProps {
  warnings: string[];
}

const WarningBox: React.FC<WarningBoxProps> = ({ warnings }) => {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4" role="alert" aria-live="polite">
      <div className="flex items-start">
        <span className="text-2xl mr-3" aria-hidden="true">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">Warnings</h3>
          <ul className="list-disc list-inside space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WarningBox;

// Made with Bob