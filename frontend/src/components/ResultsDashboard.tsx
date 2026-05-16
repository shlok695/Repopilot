import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ScanResult } from '../types/scan';
import VulnTable from './VulnTable';
import BugTable from './BugTable';
import DownloadButton from './DownloadButton';

interface ResultsDashboardProps {
  scanResult: ScanResult;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ scanResult }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'readme' | 'vulnerabilities' | 'bugs' | 'fixes' | 'report'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'readme', label: 'README', icon: '📝' },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: '🔒', count: scanResult.vulnerabilities.length },
    { id: 'bugs', label: 'Bugs', icon: '🐛', count: scanResult.bugs.length },
    { id: 'fixes', label: 'Suggested Fixes', icon: '💡', count: scanResult.suggestedFixes.length },
    { id: 'report', label: 'Full Report', icon: '📄' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {scanResult.repoMetadata.name}
            </h1>
            <p className="text-gray-600">
              Scan ID: <span className="font-mono text-sm">{scanResult.scanId}</span>
            </p>
          </div>
          <DownloadButton scanId={scanResult.scanId} />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Vulnerabilities</p>
              <p className="text-3xl font-bold text-red-600">{scanResult.vulnerabilities.length}</p>
            </div>
            <span className="text-4xl">🔒</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Bugs</p>
              <p className="text-3xl font-bold text-orange-600">{scanResult.bugs.length}</p>
            </div>
            <span className="text-4xl">🐛</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Suggested Fixes</p>
              <p className="text-3xl font-bold text-blue-600">{scanResult.suggestedFixes.length}</p>
            </div>
            <span className="text-4xl">💡</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Warnings</p>
              <p className="text-3xl font-bold text-yellow-600">{scanResult.warnings.length}</p>
            </div>
            <span className="text-4xl">⚠️</span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {scanResult.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Warnings</h3>
          <ul className="list-disc list-inside space-y-1">
            {scanResult.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-yellow-700">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Repository Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {scanResult.repoMetadata.languages.map((lang, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Frameworks</h3>
                    <div className="flex flex-wrap gap-2">
                      {scanResult.repoMetadata.frameworks.map((framework, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {framework}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Repository Stats</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>📁 Files: {scanResult.repoMetadata.fileCount}</li>
                      <li>📝 Lines of Code: {scanResult.repoMetadata.totalLines.toLocaleString()}</li>
                      <li>🐳 Docker: {scanResult.repoMetadata.hasDocker ? '✅ Yes' : '❌ No'}</li>
                      <li>🧪 Tests: {scanResult.repoMetadata.hasTests ? '✅ Yes' : '❌ No'}</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Scan Summary</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>🔒 Vulnerabilities: {scanResult.vulnerabilities.length}</li>
                      <li>🐛 Bugs: {scanResult.bugs.length}</li>
                      <li>💡 Suggested Fixes: {scanResult.suggestedFixes.length}</li>
                      <li>⚠️ Warnings: {scanResult.warnings.length}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* README Tab */}
          {activeTab === 'readme' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Auto-Generated README</h2>
              <div className="prose max-w-none bg-gray-50 rounded-lg p-6">
                <ReactMarkdown>{scanResult.readme.content}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Vulnerabilities Tab */}
          {activeTab === 'vulnerabilities' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Security Vulnerabilities</h2>
              <VulnTable vulnerabilities={scanResult.vulnerabilities} />
            </div>
          )}

          {/* Bugs Tab */}
          {activeTab === 'bugs' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Code Quality Issues</h2>
              <BugTable bugs={scanResult.bugs} />
            </div>
          )}

          {/* Suggested Fixes Tab */}
          {activeTab === 'fixes' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Suggested Fixes</h2>
              {scanResult.suggestedFixes.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 block">✅</span>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Fixes Needed</h3>
                  <p className="text-gray-600">Your repository is in great shape!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scanResult.suggestedFixes.map((fix, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <span className="text-2xl mr-3">💡</span>
                        <p className="text-gray-800">{fix}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Full Report Tab */}
          {activeTab === 'report' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Full Report</h2>
                <DownloadButton scanId={scanResult.scanId} />
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 mb-4">
                  The full report includes all findings, recommendations, and detailed analysis.
                  Click the download button above to get the complete Markdown report.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Report Includes:</h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>✓ Executive Summary</li>
                      <li>✓ Repository Metadata</li>
                      <li>✓ Auto-Generated README</li>
                      <li>✓ Vulnerability Details</li>
                      <li>✓ Bug Analysis</li>
                      <li>✓ Suggested Fixes</li>
                      <li>✓ Dependency Inventory</li>
                      <li>✓ License Information</li>
                      <li>✓ Code Complexity Analysis</li>
                      <li>✓ Test Coverage Report</li>
                    </ul>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Report Format:</h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>📄 Format: Markdown (.md)</li>
                      <li>📊 Tables and Charts</li>
                      <li>🎨 Formatted for GitHub</li>
                      <li>📋 Easy to Share</li>
                      <li>🔍 Searchable Content</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;

// Made with Bob
