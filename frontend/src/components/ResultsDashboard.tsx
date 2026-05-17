import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ScanResult, Vulnerability, Bug } from '../types/scan';
import WarningBox from './WarningBox';
import ShareActions from './ShareActions';
import ErrorBanner from './ErrorBanner';

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
      return 'bg-red-100 text-red-900 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
    case 'MEDIUM':
      return 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
    case 'LOW':
      return 'bg-green-100 text-green-900 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
    case 'INFO':
      return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    default:
      return 'bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
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
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No high-risk secrets detected</p>
        <p className="mt-1 text-xs">Dependency and secret scanners did not report critical issues.</p>
      </div>
    );
  }

  const sortedVulns = sortBySeverity(vulnerabilities);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Severity
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Title
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Package
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tool
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {sortedVulns.map((vuln, index) => (
            <React.Fragment key={index}>
              <tr
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer focus-within:bg-gray-50 dark:focus-within:bg-gray-700"
                onClick={() => toggleRow(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleRow(index);
                  }
                }}
                aria-expanded={expandedRows.has(index)}
                aria-label={`${vuln.severity} severity: ${getIssueTitle(vuln)}. Click to ${expandedRows.has(index) ? 'collapse' : 'expand'} details.`}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded border ${getSeverityBadgeClass(vuln.severity)}`}>
                    {vuln.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                  {getIssueTitle(vuln)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {getStringField(vuln, 'packageName') || vuln.file || '-'}
                  {getStringField(vuln, 'version') && <span className="text-gray-400 dark:text-gray-500"> @{getStringField(vuln, 'version')}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {vuln.tool || '-'}
                </td>
              </tr>
              {expandedRows.has(index) && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <strong className="text-blue-900 dark:text-blue-400">Recommendation:</strong>
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
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No code quality blockers found</p>
        <p className="mt-1 text-xs">RepoPilot did not detect high-signal bug patterns.</p>
      </div>
    );
  }

  const sortedBugs = sortBySeverity(bugs);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Severity
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Title
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              File
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tool
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {sortedBugs.map((bug, index) => (
            <React.Fragment key={index}>
              <tr
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer focus-within:bg-gray-50 dark:focus-within:bg-gray-700"
                onClick={() => toggleRow(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleRow(index);
                  }
                }}
                aria-expanded={expandedRows.has(index)}
                aria-label={`${bug.severity} severity: ${getIssueTitle(bug)}. Click to ${expandedRows.has(index) ? 'collapse' : 'expand'} details.`}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded border ${getSeverityBadgeClass(bug.severity)}`}>
                    {bug.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                  {getIssueTitle(bug)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {bug.file || '-'}
                  {getNumberField(bug, 'line') && <span className="text-gray-400 dark:text-gray-500">:{getNumberField(bug, 'line')}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {bug.tool || '-'}
                </td>
              </tr>
              {expandedRows.has(index) && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <strong className="text-blue-900 dark:text-blue-400">Recommendation:</strong>
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
  const [activeTab, setActiveTab] = useState('overview');
  const [actionError, setActionError] = useState<string | null>(null);

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
  const packageJson = asRecord(repoMetadata).packageJson;
  const dependencyCount =
    getStringArrayField(packageJson, 'topDependencies').length +
    getStringArrayField(repoMetadata, 'pythonPackages').length;
  const licenseFindings = vulnerabilities.filter((vuln) =>
    `${vuln.tool} ${vuln.issue}`.toLowerCase().includes('license'),
  ).length;
  const highSecurityCount = vulnerabilities.filter((vuln) =>
    ['CRITICAL', 'HIGH'].includes(vuln.severity.toUpperCase()),
  ).length;

  const summaryCards = [
    {
      label: 'Security Issues',
      value: vulnerabilities.length,
      note: highSecurityCount ? `${highSecurityCount} high risk` : 'No high-risk secrets detected',
      accent: vulnerabilities.length ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300',
    },
    {
      label: 'Bugs / Code Quality',
      value: bugs.length,
      note: bugs.length ? 'Review quality findings' : 'No blockers found',
      accent: bugs.length ? 'text-amber-600 dark:text-amber-300' : 'text-green-600 dark:text-green-300',
    },
    {
      label: 'Dependencies',
      value: dependencyCount || 'Scanned',
      note: 'Dependency inventory',
      accent: 'text-cyan-600 dark:text-cyan-300',
    },
    {
      label: 'License Findings',
      value: licenseFindings,
      note: licenseFindings ? 'Review license notes' : 'No license conflicts found',
      accent: licenseFindings ? 'text-amber-600 dark:text-amber-300' : 'text-green-600 dark:text-green-300',
    },
    {
      label: 'Report Status',
      value: finalReport ? 'Ready' : 'Pending',
      note: status,
      accent: finalReport ? 'text-green-600 dark:text-green-300' : 'text-slate-600 dark:text-slate-300',
    },
  ];

  const agentCards = [
    ['repoAnalyzerAgent', 'Maps languages, files, frameworks, package metadata, and project shape.'],
    ['readmeGeneratorAgent', 'Creates README content from detected repo structure and tech stack.'],
    ['vulnerabilityScannerAgent', 'Runs dependency and static security checks for known risks.'],
    ['bugScannerAgent', 'Finds lint, quality, and risky code patterns.'],
    ['secretsAgent', 'Looks for exposed credentials and secret-like patterns.'],
    ['dependencyInventoryAgent', 'Summarizes dependency inventory and package signals.'],
    ['licenseScannerAgent', 'Checks license metadata and flags possible conflicts.'],
    ['reportGeneratorAgent', 'Combines all findings into the final downloadable report.'],
  ];

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(readme);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'readme', label: 'README' },
    { id: 'vulnerabilities', label: 'Vulnerabilities' },
    { id: 'bugs', label: 'Bugs' },
    { id: 'fixes', label: 'Suggested Fixes' },
    { id: 'report', label: 'Full Report' },
  ];
  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const panelClassName = 'transition-all duration-300 ease-in-out opacity-100 translate-y-0';

  const overviewPanel = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print-friendly">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.accent}`}>{card.value}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print-friendly">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Vulns</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{vulnerabilities.length}</p>
            </div>
            <div className={`text-3xl ${vulnerabilities.length > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'}`} aria-hidden="true">🔒</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Bugs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{bugs.length}</p>
            </div>
            <div className={`text-3xl ${bugs.length > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-300 dark:text-gray-600'}`} aria-hidden="true">🐛</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Fixes Suggested</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{suggestedFixes.length}</p>
            </div>
            <div className="text-3xl text-blue-500 dark:text-blue-400" aria-hidden="true">💡</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Warnings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{warnings.length}</p>
            </div>
            <div className="text-3xl text-yellow-500 dark:text-yellow-400" aria-hidden="true">⚠️</div>
          </div>
        </div>
      </div>

      {vulnerabilities.length === 0 && bugs.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4" role="status" aria-live="polite">
          <div className="flex items-center">
            <span className="text-2xl mr-3" aria-hidden="true">✅</span>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 dark:text-green-400">All Clear: No vulnerabilities or bugs found.</h3>
            </div>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <WarningBox warnings={warnings} />
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 print-friendly">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">RepoPilot Agent Pipeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {agentCards.map(([name, description]) => (
            <div key={name} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
              <h3 className="font-mono text-sm font-semibold text-slate-950 dark:text-white">{name}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 print-friendly">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{repoName}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {techStack.length > 0 && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">Tech Stack</p>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Total Files</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{totalFiles}</p>
          </div>
          {typeof totalLines === 'number' && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">Total Lines</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{totalLines.toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Package Manager</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">{packageManager}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Status</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{status}</p>
          </div>
          {timestamp && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">Timestamp</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">{timestamp}</p>
            </div>
          )}
          {completedAt && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">Completed At</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">{completedAt}</p>
            </div>
          )}
        </div>
      </div>

      {scanResult?.error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-sm border border-red-200 dark:border-red-800 p-6">
          <h2 className="text-2xl font-bold text-red-900 dark:text-red-400 mb-2">Error</h2>
          <p className="text-sm text-red-800 dark:text-red-300 font-mono">{scanResult.error}</p>
        </div>
      )}

      {readmeFeedback && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 print-friendly">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Documentation Feedback</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {typeof readmeFeedback.score === 'number' && (
              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">Score</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{readmeFeedback.score}</p>
              </div>
            )}
            {readmeStrengths.length > 0 && (
              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">Strengths</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  {readmeStrengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            {readmeImprovements.length > 0 && (
              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">Improvements</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  {readmeImprovements.map((improvement, idx) => (
                    <li key={idx}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const readmePanel = (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 print-friendly">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">README</h2>
        {readme && (
          <button
            onClick={handleCopyMarkdown}
            aria-label={copySuccess ? 'Markdown copied to clipboard' : 'Copy README as markdown'}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors no-print focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            {copySuccess ? '✓ Copied!' : 'Copy Markdown'}
          </button>
        )}
      </div>
      {readme ? (
        <div className="max-w-none space-y-4 text-sm text-gray-800 dark:text-gray-200 [&_a]:text-blue-700 dark:[&_a]:text-blue-400 [&_code]:rounded [&_code]:bg-gray-100 dark:[&_code]:bg-gray-700 [&_code]:px-1 [&_code]:font-mono [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-950 dark:[&_h1]:text-white [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-950 dark:[&_h2]:text-white [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 dark:[&_h3]:text-gray-100 [&_li]:ml-5 [&_li]:list-disc [&_pre]:rounded-lg [&_pre]:bg-gray-50 dark:[&_pre]:bg-gray-900 [&_pre]:p-3 [&_pre]:text-gray-800 dark:[&_pre]:text-gray-200 [&_pre]:font-mono">
          <ReactMarkdown>{readme}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-gray-400 dark:text-gray-500 text-sm">No README available</p>
      )}
    </div>
  );

  const vulnerabilitiesPanel = (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 print-friendly">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vulnerabilities</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          vulnerabilities.length > 0
            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`} aria-label={`${vulnerabilities.length} vulnerabilities found`}>
          {vulnerabilities.length}
        </span>
      </div>
      <VulnTable vulnerabilities={vulnerabilities} />
    </div>
  );

  const bugsPanel = (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 print-friendly">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bugs</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          bugs.length > 0
            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`} aria-label={`${bugs.length} bugs found`}>
          {bugs.length}
        </span>
      </div>
      <BugTable bugs={bugs} />
    </div>
  );

  const fixesPanel = (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 print-friendly">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Suggested Fixes</h2>
      {suggestedFixes.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm">No fixes suggested</p>
      ) : (
        <ol className="list-decimal space-y-4 pl-5">
          {suggestedFixes.map((fix, idx) => (
            <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 pl-2">
              <div className="font-mono text-xs bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 p-3 text-slate-800 dark:text-slate-200">
                <p className="font-semibold text-slate-950 dark:text-slate-100">{fix.title}</p>
                <p className="mt-1 whitespace-pre-wrap">{fix.description}</p>
                {fix.file && (
                  <p className="mt-2 text-blue-700 dark:text-blue-400">File: {fix.file}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  const reportPanel = (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 print-friendly">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Final Report</h2>
      {finalReport ? (
        <details
          className="cursor-pointer"
          open={reportExpanded}
          onToggle={(e) => setReportExpanded((e.target as HTMLDetailsElement).open)}
        >
          <summary className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded">
            {reportExpanded ? '▼' : '▶'} Click to {reportExpanded ? 'collapse' : 'expand'} raw Markdown
          </summary>
          <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {finalReport}
          </pre>
        </details>
      ) : (
        <p className="text-gray-400 dark:text-gray-500 text-sm">No final report available</p>
      )}
    </div>
  );

  const panels: Record<string, React.ReactNode> = {
    overview: overviewPanel,
    readme: readmePanel,
    vulnerabilities: vulnerabilitiesPanel,
    bugs: bugsPanel,
    fixes: fixesPanel,
    report: reportPanel,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 print-friendly">
      {actionError && (
        <div className="no-print">
          <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
        </div>
      )}

      {scanResult && (
        <ShareActions scanResult={scanResult} onError={setActionError} />
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 no-print">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2" role="tablist" aria-label="Results sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab(tab.id);
                }
              }}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                activeTab === tab.id
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        key={activeTab}
        role="tabpanel"
        id={`panel-${activeTabMeta.id}`}
        aria-labelledby={`tab-${activeTabMeta.id}`}
        className={panelClassName}
      >
        {panels[activeTab]}
      </div>
    </div>
  );
}

// Made with Bob
