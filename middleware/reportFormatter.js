const SEVERITY_LABEL = {
  CRITICAL: '[CRITICAL]',
  HIGH: '[HIGH]',
  MEDIUM: '[MEDIUM]',
  LOW: '[LOW]',
  INFO: '[INFO]',
};

const TESTING_RECOMMENDATIONS = {
  'Node.js': ['Jest for unit tests', 'Supertest for HTTP integration tests', 'c8 or Istanbul for coverage'],
  JavaScript: ['Jest or Vitest for unit tests', 'ESLint in CI'],
  TypeScript: ['tsc --noEmit in CI', 'ts-jest or Vitest for typed test suites'],
  React: ['React Testing Library for component tests', 'Playwright or Cypress for end-to-end checks'],
  Python: ['pytest for unit tests', 'pytest-cov for coverage', 'bandit for security linting'],
  Express: ['Supertest for route testing', 'Jest for assertions and mocks'],
  Docker: ['docker compose config validation', 'Container structure tests for image checks'],
};

const SECURITY_TIPS = [
  'Keep dependencies up to date and run dependency audits regularly.',
  'Never commit secrets, API keys, or credentials to version control.',
  'Use environment variables or a secrets manager for sensitive configuration.',
  'Enable branch protection and require code review before merging.',
  'Run security scans in CI/CD before release.',
  'Apply least privilege for database, cloud, and deployment credentials.',
  'Use rate limiting and strict input validation on public APIs.',
];

function escapeCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function formatFix(fix) {
  if (typeof fix === 'string') {
    return fix;
  }

  const title = fix?.title || 'Suggested fix';
  const description = fix?.description ? ` - ${fix.description}` : '';
  const file = fix?.file ? ` (${fix.file})` : '';
  const effort = fix?.effort ? ` Effort: ${fix.effort}.` : '';
  const docs = fix?.docs ? ` Docs: ${fix.docs}` : '';
  return `${title}${file}${description}${effort}${docs}`;
}

function getTopFindings(vulnerabilities, bugs, limit = 3) {
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  return [
    ...vulnerabilities.map(item => ({ ...item, type: 'Vulnerability' })),
    ...bugs.map(item => ({ ...item, type: 'Bug' })),
  ]
    .sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5))
    .slice(0, limit);
}

function getVerdict(vulnerabilities, bugs) {
  if (vulnerabilities.some(item => item.severity === 'CRITICAL' || item.severity === 'HIGH')) {
    return 'Immediate action required: high or critical security findings should be fixed before production use.';
  }

  if ([...vulnerabilities, ...bugs].some(item => item.severity === 'MEDIUM')) {
    return 'Review before production: medium severity issues should be scheduled before the next release.';
  }

  return 'Good shape overall: no high-severity findings were detected, but review the suggested improvements.';
}

function detectPackageManagers(meta) {
  const managers = [];
  const languages = (meta.languages || []).map(item => item.toLowerCase());
  const frameworks = (meta.frameworks || []).map(item => item.toLowerCase());

  if (meta.packageManager && meta.packageManager !== 'unknown') {
    managers.push(meta.packageManager);
  }
  if (languages.includes('javascript') || languages.includes('typescript') || frameworks.some(item => ['react', 'vue', 'express', 'next.js', 'vite'].includes(item))) {
    managers.push('npm/yarn/pnpm');
  }
  if (languages.includes('python') || frameworks.some(item => ['flask', 'django', 'fastapi'].includes(item))) {
    managers.push('pip/poetry');
  }
  if (languages.includes('go')) managers.push('Go modules');
  if (languages.includes('rust')) managers.push('Cargo');

  return [...new Set(managers)].join(', ') || 'Unknown';
}

function buildTestingRecommendations(meta) {
  const allTech = [...(meta.languages || []), ...(meta.frameworks || [])];
  const recommendations = [];
  const seen = new Set();

  allTech.forEach(tech => {
    const key = Object.keys(TESTING_RECOMMENDATIONS).find(item => item.toLowerCase() === tech.toLowerCase());
    if (key && !seen.has(key)) {
      seen.add(key);
      recommendations.push({ tech: key, items: TESTING_RECOMMENDATIONS[key] });
    }
  });

  if (meta.hasDocker && !seen.has('Docker')) {
    recommendations.push({ tech: 'Docker', items: TESTING_RECOMMENDATIONS.Docker });
  }

  return recommendations;
}

export const formatFinalReport = (scanResult) => {
  const {
    scanId,
    repoMetadata = {},
    readme = {},
    vulnerabilities = [],
    bugs = [],
    suggestedFixes = [],
    warnings = [],
    timestamp,
    scanDuration,
  } = scanResult;

  const languages = repoMetadata.languages || [];
  const frameworks = repoMetadata.frameworks || [];
  const fileCount = repoMetadata.fileCount || repoMetadata.totalFiles || 0;
  const totalLines = repoMetadata.totalLines || 0;
  const generatedAt = timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString();

  let markdown = '# RepoPilot Security & Code Quality Report\n\n';
  markdown += `**Scan ID:** \`${scanId}\`  \n`;
  markdown += `**Generated:** ${generatedAt}  \n`;
  if (scanDuration) {
    markdown += `**Scan Duration:** ${(scanDuration / 1000).toFixed(1)}s  \n`;
  }
  markdown += `**Repository:** ${repoMetadata.name || 'Unknown'}\n\n`;
  markdown += '---\n\n';

  markdown += '## Executive Summary\n\n';
  markdown += `- **${vulnerabilities.length}** security vulnerabilities found\n`;
  markdown += `- **${bugs.length}** code quality issues detected\n`;
  markdown += `- **${suggestedFixes.length}** suggested fixes generated\n\n`;

  const topFindings = getTopFindings(vulnerabilities, bugs);
  if (topFindings.length > 0) {
    markdown += '**Top Findings:**\n';
    topFindings.forEach((finding, index) => {
      markdown += `${index + 1}. ${SEVERITY_LABEL[finding.severity] || finding.severity || '[INFO]'} ${finding.type}: ${escapeCell(finding.issue || finding.title || 'Unknown issue')}\n`;
    });
    markdown += '\n';
  }

  markdown += '| Metric | Count |\n';
  markdown += '|--------|-------|\n';
  markdown += `| Vulnerabilities | ${vulnerabilities.length} |\n`;
  markdown += `| Bugs | ${bugs.length} |\n`;
  markdown += `| Suggested Fixes | ${suggestedFixes.length} |\n`;
  markdown += `| Warnings | ${warnings.length} |\n`;
  markdown += `| Files | ${fileCount} |\n`;
  markdown += `| Lines of Code | ${totalLines.toLocaleString()} |\n\n`;

  markdown += '## Repository Overview\n\n';
  markdown += '| Property | Value |\n';
  markdown += '|----------|-------|\n';
  markdown += `| Name | ${escapeCell(repoMetadata.name || 'Unknown')} |\n`;
  markdown += `| Languages | ${escapeCell(languages.join(', ') || 'Unknown')} |\n`;
  markdown += `| Frameworks | ${escapeCell(frameworks.join(', ') || 'None detected')} |\n`;
  markdown += `| Package Manager | ${escapeCell(detectPackageManagers(repoMetadata))} |\n`;
  markdown += `| Docker | ${repoMetadata.hasDocker ? 'Yes' : 'No'} |\n`;
  markdown += `| Tests | ${repoMetadata.hasTests ? 'Yes' : 'No'} |\n\n`;

  markdown += '## Security Vulnerabilities\n\n';
  if (vulnerabilities.length === 0) {
    markdown += 'No vulnerabilities detected.\n\n';
  } else {
    markdown += '| Severity | Tool | File | Issue | Recommendation |\n';
    markdown += '|----------|------|------|-------|----------------|\n';
    vulnerabilities.forEach(vuln => {
      const severity = vuln.severity || 'INFO';
      markdown += `| ${SEVERITY_LABEL[severity] || severity} | ${escapeCell(vuln.tool)} | \`${escapeCell(vuln.file)}\` | ${escapeCell(vuln.issue || vuln.title)} | ${escapeCell(vuln.recommendation)} |\n`;
    });
    markdown += '\n';
  }

  markdown += '## Code Quality Issues\n\n';
  if (bugs.length === 0) {
    markdown += 'No code quality issues detected.\n\n';
  } else {
    markdown += '| Severity | Tool | File | Issue | Recommendation |\n';
    markdown += '|----------|------|------|-------|----------------|\n';
    bugs.forEach(bug => {
      const severity = bug.severity || 'INFO';
      markdown += `| ${SEVERITY_LABEL[severity] || severity} | ${escapeCell(bug.tool)} | \`${escapeCell(bug.file)}\` | ${escapeCell(bug.issue || bug.title)} | ${escapeCell(bug.recommendation)} |\n`;
    });
    markdown += '\n';
  }

  markdown += '## Suggested Fixes\n\n';
  if (suggestedFixes.length === 0) {
    markdown += 'No fixes needed.\n\n';
  } else {
    suggestedFixes.forEach((fix, index) => {
      markdown += `${index + 1}. ${formatFix(fix)}\n`;
    });
    markdown += '\n';
  }

  markdown += '## Testing Recommendations\n\n';
  const testRecommendations = buildTestingRecommendations(repoMetadata);
  if (testRecommendations.length > 0) {
    testRecommendations.forEach(({ tech, items }) => {
      markdown += `### ${tech}\n`;
      items.forEach(item => {
        markdown += `- ${item}\n`;
      });
      markdown += '\n';
    });
  } else {
    markdown += '- Add unit tests for critical functions.\n';
    markdown += '- Add integration tests for user-facing workflows.\n';
    markdown += '- Run tests and scanners in CI before merging.\n\n';
  }

  markdown += '## Security Notes\n\n';
  SECURITY_TIPS.forEach(tip => {
    markdown += `- ${tip}\n`;
  });
  markdown += '\n';

  if (warnings.length > 0) {
    markdown += '## Warnings\n\n';
    warnings.forEach(warning => {
      markdown += `- ${warning}\n`;
    });
    markdown += '\n';
  }

  markdown += '## Generated README\n\n';
  markdown += `${readme.content || '_No README was generated for this repository._'}\n\n`;

  markdown += '## Final Recommendation\n\n';
  markdown += `${getVerdict(vulnerabilities, bugs)}\n\n`;

  markdown += '---\n\n';
  markdown += '*Report generated by RepoPilot - AI-Powered Repository Analysis*  \n';
  markdown += `*Scan ID: ${scanId}*\n`;

  return markdown;
};

// Made with Bob
