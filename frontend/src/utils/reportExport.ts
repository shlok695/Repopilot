import { ScanResult } from '../types/scan';

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate a self-contained HTML report from scan results
 */
export function generateHtmlReport(scanResult: ScanResult): string {
  const repoName = scanResult.repoMetadata?.name || 'Unknown Repository';
  const scanId = scanResult.scanId;
  const status = scanResult.status;
  const timestamp = scanResult.timestamp || scanResult.createdAt || 'N/A';
  const vulnerabilities = scanResult.vulnerabilities || [];
  const bugs = scanResult.bugs || [];
  const suggestedFixes = scanResult.suggestedFixes || [];
  const warnings = scanResult.warnings || [];
  const readmeFeedback = scanResult.readmeFeedback;
  const fullReport = scanResult.reportMarkdown || scanResult.fullReport || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RepoPilot Report - ${escapeHtml(repoName)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f9fafb;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1f2937;
      font-size: 2rem;
      margin-bottom: 1rem;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 0.5rem;
    }
    h2 {
      color: #374151;
      font-size: 1.5rem;
      margin-top: 2rem;
      margin-bottom: 1rem;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }
    h3 {
      color: #4b5563;
      font-size: 1.25rem;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
      padding: 1rem;
      background: #f3f4f6;
      border-radius: 6px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .meta-value {
      font-size: 1rem;
      color: #1f2937;
      font-weight: 500;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      padding: 1rem;
      border-radius: 6px;
      text-align: center;
    }
    .stat-card.vulns {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }
    .stat-card.bugs {
      background: #fff7ed;
      border: 1px solid #fed7aa;
    }
    .stat-card.fixes {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .stat-card.warnings {
      background: #fefce8;
      border: 1px solid #fde047;
    }
    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 0.25rem;
    }
    .stat-label {
      font-size: 0.875rem;
      color: #6b7280;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th {
      background: #f3f4f6;
      padding: 0.75rem;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 0.75rem;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    .severity {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .severity.critical, .severity.high {
      background: #fee2e2;
      color: #991b1b;
    }
    .severity.medium {
      background: #fed7aa;
      color: #9a3412;
    }
    .severity.low {
      background: #fef3c7;
      color: #92400e;
    }
    .severity.info {
      background: #dbeafe;
      color: #1e40af;
    }
    .warning-box {
      background: #fefce8;
      border: 1px solid #fde047;
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
    }
    .warning-item {
      padding: 0.5rem 0;
      border-bottom: 1px solid #fde68a;
    }
    .warning-item:last-child {
      border-bottom: none;
    }
    .fix-item {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 1rem;
      margin: 0.5rem 0;
    }
    .fix-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }
    .fix-description {
      color: #4b5563;
      font-size: 0.875rem;
      white-space: pre-wrap;
    }
    .fix-file {
      color: #3b82f6;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      font-family: monospace;
    }
    .report-content {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 1.5rem;
      margin: 1rem 0;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 0.875rem;
      overflow-x: auto;
    }
    .all-clear {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
      color: #166534;
      font-weight: 600;
    }
    .readme-feedback {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
    }
    .feedback-score {
      font-size: 1.5rem;
      font-weight: bold;
      color: #0369a1;
      margin-bottom: 0.5rem;
    }
    ul {
      margin-left: 1.5rem;
      margin-top: 0.5rem;
    }
    li {
      margin: 0.25rem 0;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 RepoPilot Scan Report</h1>
    
    <div class="meta">
      <div class="meta-item">
        <span class="meta-label">Repository</span>
        <span class="meta-value">${escapeHtml(repoName)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Scan ID</span>
        <span class="meta-value">${escapeHtml(scanId)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Status</span>
        <span class="meta-value">${escapeHtml(status)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Timestamp</span>
        <span class="meta-value">${escapeHtml(timestamp)}</span>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card vulns">
        <div class="stat-number">${vulnerabilities.length}</div>
        <div class="stat-label">Vulnerabilities</div>
      </div>
      <div class="stat-card bugs">
        <div class="stat-number">${bugs.length}</div>
        <div class="stat-label">Bugs</div>
      </div>
      <div class="stat-card fixes">
        <div class="stat-number">${suggestedFixes.length}</div>
        <div class="stat-label">Suggested Fixes</div>
      </div>
      <div class="stat-card warnings">
        <div class="stat-number">${warnings.length}</div>
        <div class="stat-label">Warnings</div>
      </div>
    </div>

    ${vulnerabilities.length === 0 && bugs.length === 0 ? `
    <div class="all-clear">
      ✅ All Clear: No vulnerabilities or bugs found.
    </div>
    ` : ''}

    ${warnings.length > 0 ? `
    <h2>⚠️ Warnings</h2>
    <div class="warning-box">
      ${warnings.map(w => `<div class="warning-item">${escapeHtml(w)}</div>`).join('')}
    </div>
    ` : ''}

    ${readmeFeedback ? `
    <h2>📄 README Feedback</h2>
    <div class="readme-feedback">
      ${typeof readmeFeedback.score === 'number' ? `
      <div class="feedback-score">Score: ${readmeFeedback.score}/10</div>
      ` : ''}
      ${readmeFeedback.strengths && readmeFeedback.strengths.length > 0 ? `
      <h3>Strengths</h3>
      <ul>
        ${readmeFeedback.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
      </ul>
      ` : ''}
      ${readmeFeedback.improvements && readmeFeedback.improvements.length > 0 ? `
      <h3>Improvements</h3>
      <ul>
        ${readmeFeedback.improvements.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
      </ul>
      ` : ''}
    </div>
    ` : ''}

    ${vulnerabilities.length > 0 ? `
    <h2>🔒 Vulnerabilities</h2>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Issue</th>
          <th>File/Package</th>
          <th>Tool</th>
          <th>Recommendation</th>
        </tr>
      </thead>
      <tbody>
        ${vulnerabilities.map(v => `
        <tr>
          <td><span class="severity ${v.severity.toLowerCase()}">${escapeHtml(v.severity)}</span></td>
          <td>${escapeHtml(v.issue)}</td>
          <td>${escapeHtml(v.file)}</td>
          <td>${escapeHtml(v.tool)}</td>
          <td>${escapeHtml(v.recommendation)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    ${bugs.length > 0 ? `
    <h2>🐛 Bugs</h2>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Issue</th>
          <th>File</th>
          <th>Tool</th>
          <th>Recommendation</th>
        </tr>
      </thead>
      <tbody>
        ${bugs.map(b => `
        <tr>
          <td><span class="severity ${b.severity.toLowerCase()}">${escapeHtml(b.severity)}</span></td>
          <td>${escapeHtml(b.issue)}</td>
          <td>${escapeHtml(b.file)}</td>
          <td>${escapeHtml(b.tool)}</td>
          <td>${escapeHtml(b.recommendation)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    ${suggestedFixes.length > 0 ? `
    <h2>💡 Suggested Fixes</h2>
    ${suggestedFixes.map(fix => `
    <div class="fix-item">
      <div class="fix-title">${escapeHtml(fix.title)}</div>
      <div class="fix-description">${escapeHtml(fix.description)}</div>
      ${fix.file ? `<div class="fix-file">File: ${escapeHtml(fix.file)}</div>` : ''}
    </div>
    `).join('')}
    ` : ''}

    ${fullReport ? `
    <h2>📋 Full Report</h2>
    <div class="report-content">${escapeHtml(fullReport)}</div>
    ` : ''}

    <hr style="margin: 2rem 0; border: none; border-top: 1px solid #e5e7eb;">
    <p style="text-align: center; color: #6b7280; font-size: 0.875rem;">
      Generated by RepoPilot on ${new Date().toLocaleString()}
    </p>
  </div>
</body>
</html>`;

  return html;
}

// Made with Bob