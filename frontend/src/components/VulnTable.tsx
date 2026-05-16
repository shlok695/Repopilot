import React from 'react';
import { Vulnerability } from '../types/scan';
import { normalizeSeverity, getSeverityColor, getSeverityOrder } from '../utils/severity';

interface VulnTableProps {
  vulnerabilities: Vulnerability[];
}

const VulnTable: React.FC<VulnTableProps> = ({ vulnerabilities }) => {
  const sortedVulns = [...vulnerabilities].sort((a, b) => {
    return getSeverityOrder(a.severity) - getSeverityOrder(b.severity);
  });

  if (vulnerabilities.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">✅</span>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Vulnerabilities Found</h3>
        <p className="text-gray-600">Great job! Your repository appears to be secure.</p>
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
          {sortedVulns.map((vuln, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getSeverityColor(vuln.severity)}`}>
                  {normalizeSeverity(vuln.severity)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {vuln.tool}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                {vuln.file}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {vuln.issue}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {vuln.recommendation}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VulnTable;

// Made with Bob
