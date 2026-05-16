import React from 'react';
import { Bug } from '../types/scan';
import { normalizeSeverity, getSeverityColor, getSeverityOrder } from '../utils/severity';

interface BugTableProps {
  bugs: Bug[];
}

const BugTable: React.FC<BugTableProps> = ({ bugs }) => {
  const sortedBugs = [...bugs].sort((a, b) => {
    return getSeverityOrder(a.severity) - getSeverityOrder(b.severity);
  });

  if (bugs.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">✨</span>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bugs Found</h3>
        <p className="text-gray-600">Excellent! Your code quality looks great.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Severity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tool
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              File
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Issue
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Recommendation
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedBugs.map((bug, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getSeverityColor(bug.severity)}`}>
                  {normalizeSeverity(bug.severity)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {bug.tool}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                {bug.file}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {bug.issue}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {bug.recommendation}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BugTable;

// Made with Bob
