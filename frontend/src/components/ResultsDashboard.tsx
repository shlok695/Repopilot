import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ScanResult, Vulnerability, Bug } from '../types/scan';

interface ResultsDashboardProps {
  scanResult?: ScanResult | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSeverityBadgeClass(severity: string): string {
  const upperSeverity = severity.toUpperCase();
  
  switch (upperSeverity) {
    case 'HIGH':
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'MEDIUM':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'LOW':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'INFO':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function getSeverityOrder(severity: string): number {
  const upperSeverity = severity.toUpperCase();
  
  switch (upperSeverity) {
    case 'HIGH':
    case 'CRITICAL':
      return 0;
    case 'MEDIUM':
      return 1;
    case 'LOW':
      return 2;
    case 'INFO':
      return 3;
    default:
      return 4;
  }
}

function sortBySeverity<T extends { severity: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity));
}

type DisplayRecord = Record<string, unknown>;

function asRecord(value: unknown): DisplayRecord {
  return value && typeof value === 'object' ? value as DisplayRecord : {};
}

function getStringField(value: unknown, field: string): string | undefined {
  const fieldValue = asRecord(value)[field];
  return typeof fieldValue === 'string' && fieldValue.trim() ? fieldValue : undefined;
}

function getNumberField(value: unknown, field: string): number | undefined {
  const fieldValue = asRecord(value)[field];
  return typeof fieldValue === 'number' ? fieldValue : undefined;
}

function getStringArrayField(value: unknown, field: string): string[] {
  const fieldValue = asRecord(value)[field];
  return Array.isArray(fieldValue)
    ? fieldValue.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
}

function getIssueTitle(item: Vulnerability | Bug): string {
  return getStringField(item, 'title') ?? item.issue ?? 'Untitled issue';
}

function getRecommendation(item: Vulnerability | Bug): string {
  return (
    item.recommendation ||
    getStringField(item, 'fix') ||
    getStringField(item, 'suggestion') ||
    'No recommendation provided.'
  );
}

function getReadmeContent(scanResult?: ScanResult | null): string {
  if (!scanResult?.readme) {
    return '';
  }

  if (typeof scanResult.readme === 'string') {
    return scanResult.readme;
  }

  return scanResult.readme.content ?? '';
}

// ============================================================================
// VULN TABLE COMPONENT
// ============================================================================

interface VulnTableProps {
  vulnerabilities: Vulnerability[];
}

const VulnTable: React.FC<VulnTableProps> = ({ vulnerabilities }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  if (vulnerabilities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">No vulnerabilities found</p>
      </div>
    );
  }

  const sortedVulns = sortBySeverity(vulnerabilities);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Severity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Package
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tool
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedVulns.map((vuln, index) => (
            <React.Fragment key={index}>
              <tr 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleRow(index)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded border ${getSeverityBadgeClass(vuln.severity)}`}>
                    {vuln.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {getIssueTitle(vuln)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {getStringField(vuln, 'packageName') || vuln.file || '-'}
                  {getStringField(vuln, 'version') && <span className="text-gray-400"> @{getStringField(vuln, 'version')}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {vuln.tool || '-'}
                </td>
              </tr>
              {expandedRows.has(index) && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 bg-blue-50">
                    <div className="text-sm text-gray-700">
                      <strong className="text-blue-900">Recommendation:</strong>
                      <p className="mt-1">{getRecommendation(vuln)}</p>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// BUG TABLE COMPONENT
// ============================================================================

interface BugTableProps {
  bugs: Bug[];
}

const BugTable: React.FC<BugTableProps> = ({ bugs }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  if (bugs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">No bugs found</p>
      </div>
    );
  }

  const sortedBugs = sortBySeverity(bugs);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Severity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              File
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tool
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedBugs.map((bug, index) => (
            <React.Fragment key={index}>
              <tr 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleRow(index)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded border ${getSeverityBadgeClass(bug.severity)}`}>
                    {bug.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {getIssueTitle(bug)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {bug.file || '-'}
                  {getNumberField(bug, 'line') && <span className="text-gray-400">:{getNumberField(bug, 'line')}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {bug.tool || '-'}
                </td>
              </tr>
              {expandedRows.has(index) && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 bg-blue-50">
                    <div className="text-sm text-gray-700">
                      <strong className="text-blue-900">Recommendation:</strong>
                      <p className="mt-1">{getRecommendation(bug)}</p>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function ResultsDashboard({ scanResult }: ResultsDashboardProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [reportExpanded, setReportExpanded] = useState(false);

  const readmeFeedback = scanResult?.readmeFeedback;
  const vulnerabilities = scanResult?.vulnerabilities ?? [];
  const bugs = scanResult?.bugs ?? [];
  const suggestedFixes = scanResult?.suggestedFixes ?? [];
  const warnings = scanResult?.warnings ?? [];
  const repoMetadata = scanResult?.repoMetadata;
  const repoName = repoMetadata?.name ?? 'Unknown repository';
  const techStack = [...(repoMetadata?.languages ?? []), ...(repoMetadata?.frameworks ?? [])];
  const totalFiles = repoMetadata?.fileCount ?? 0;
  const totalLines = repoMetadata?.totalLines;
  const packageManager = getStringField(repoMetadata, 'packageManager') ?? 'Unknown';
  const readme = getReadmeContent(scanResult);
  const finalReport = scanResult?.reportMarkdown ?? scanResult?.fullReport ?? '';
  const status = scanResult?.status ?? 'Unknown';
  const timestamp = scanResult?.timestamp ?? getStringField(scanResult, 'createdAt');
  const completedAt = getStringField(scanResult, 'completedAt');
  const readmeStrengths = getStringArrayField(readmeFeedback, 'strengths');
  const readmeImprovements = getStringArrayField(readmeFeedback, 'improvements');

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(readme);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* A. Summary Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Vulns</p>
              <p className="text-2xl font-bold text-gray-900">{vulnerabilities.length}</p>
            </div>
            <div className={`text-3xl ${vulnerabilities.length > 0 ? 'text-red-500' : 'text-gray-300'}`}>
              🔒
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bugs</p>
              <p className="text-2xl font-bold text-gray-900">{bugs.length}</p>
            </div>
            <div className={`text-3xl ${bugs.length > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
              🐛
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Fixes Suggested</p>
              <p className="text-2xl font-bold text-gray-900">{suggestedFixes.length}</p>
            </div>
            <div className="text-3xl text-blue-500">💡</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Warnings</p>
              <p className="text-2xl font-bold text-gray-900">{warnings.length}</p>
            </div>
            <div className="text-3xl text-yellow-500">⚠️</div>
          </div>
        </div>
      </div>

      {/* B. Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {repoName}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {techStack.length > 0 && (
            <div>
              <p className="text-gray-600 mb-2">Tech Stack</p>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-gray-600 mb-2">Total Files</p>
            <p className="text-lg font-semibold text-gray-900">{totalFiles}</p>
          </div>
          {typeof totalLines === 'number' && (
            <div>
              <p className="text-gray-600 mb-2">Total Lines</p>
              <p className="text-lg font-semibold text-gray-900">{totalLines.toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-gray-600 mb-2">Package Manager</p>
            <p className="text-lg font-semibold text-gray-900">{packageManager}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-2">Status</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{status}</p>
          </div>
          {timestamp && (
            <div>
              <p className="text-gray-600 mb-2">Timestamp</p>
              <p className="text-sm font-medium text-gray-900">{timestamp}</p>
            </div>
          )}
          {completedAt && (
            <div>
              <p className="text-gray-600 mb-2">Completed At</p>
              <p className="text-sm font-medium text-gray-900">{completedAt}</p>
            </div>
          )}
        </div>
      </div>

      {scanResult?.error && (
        <div className="bg-red-50 rounded-2xl shadow-sm border border-red-200 p-6">
          <h2 className="text-2xl font-bold text-red-900 mb-2">Error</h2>
          <p className="text-sm text-red-800">{scanResult.error}</p>
        </div>
      )}

      {/* C. README Section */}
      {readme && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">README</h2>
            <button
              onClick={handleCopyMarkdown}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              {copySuccess ? '✓ Copied!' : 'Copy Markdown'}
            </button>
          </div>
          <div className="prose max-w-none text-sm">
            <ReactMarkdown>{readme}</ReactMarkdown>
          </div>
        </div>
      )}

      {readmeFeedback && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Documentation Feedback</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {typeof readmeFeedback.score === 'number' && (
              <div>
                <p className="text-gray-600 mb-2">Score</p>
                <p className="text-lg font-semibold text-gray-900">{readmeFeedback.score}</p>
              </div>
            )}
            {readmeStrengths.length > 0 && (
              <div>
                <p className="text-gray-600 mb-2">Strengths</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {readmeStrengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            {readmeImprovements.length > 0 && (
              <div>
                <p className="text-gray-600 mb-2">Improvements</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {readmeImprovements.map((improvement, idx) => (
                    <li key={idx}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* D. Vulnerability Section */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Vulnerabilities</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            vulnerabilities.length > 0 
              ? 'bg-red-100 text-red-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {vulnerabilities.length}
          </span>
        </div>
        <VulnTable vulnerabilities={vulnerabilities} />
      </div>

      {/* E. Bug Section */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Bugs</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            bugs.length > 0 
              ? 'bg-orange-100 text-orange-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {bugs.length}
          </span>
        </div>
        <BugTable bugs={bugs} />
      </div>

      {/* F. Suggested Fixes */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Suggested Fixes</h2>
        {suggestedFixes.length === 0 ? (
          <p className="text-gray-400 text-sm">No fixes suggested</p>
        ) : (
          <ol className="list-decimal space-y-4 pl-5">
            {suggestedFixes.map((fix, idx) => (
              <li key={idx} className="text-sm text-gray-700 pl-2">
                <div className="font-mono text-xs bg-slate-50 rounded border border-slate-200 p-3 text-slate-800">
                  <p className="font-semibold text-slate-950">{fix.title}</p>
                  <p className="mt-1 whitespace-pre-wrap">{fix.description}</p>
                  {fix.file && (
                    <p className="mt-2 text-blue-700">File: {fix.file}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* G. Warnings */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Warnings</h2>
        {warnings.length === 0 ? (
          <p className="text-gray-400 text-sm">No warnings</p>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <ul className="list-disc list-inside space-y-2">
              {warnings.map((warning, idx) => (
                <li key={idx} className="text-sm text-yellow-800">{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* H. Final Report */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Final Report</h2>
        {finalReport ? (
          <details 
            className="cursor-pointer"
            open={reportExpanded}
            onToggle={(e) => setReportExpanded((e.target as HTMLDetailsElement).open)}
          >
            <summary className="text-blue-600 hover:text-blue-800 font-medium text-sm mb-2">
              {reportExpanded ? '▼' : '▶'} Click to {reportExpanded ? 'collapse' : 'expand'} raw Markdown
            </summary>
            <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-800 whitespace-pre-wrap">
              {finalReport}
            </pre>
          </details>
        ) : (
          <p className="text-gray-400 text-sm">No final report available</p>
        )}
      </div>

      {/* I. Download Button */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Download Report</h2>
        {scanResult?.scanId ? (
          <a
            href={`/api/scan/${scanResult.scanId}/download`}
            download
            className="inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            📥 Download Full Report
          </a>
        ) : (
          <button
            disabled
            className="inline-block px-6 py-3 bg-gray-300 text-gray-500 font-medium rounded-lg cursor-not-allowed"
          >
            📥 Download Not Available
          </button>
        )}
      </div>
    </div>
  );
}

// Made with Bob
