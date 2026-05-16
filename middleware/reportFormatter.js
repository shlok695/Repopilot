// ─── Severity Emoji Map ──────────────────────────────────────────────

const SEVERITY_EMOJI = {
  CRITICAL: '🔴',
  HIGH: '🔴',
  MEDIUM: '🟠',
  LOW: '🟡',
  INFO: '🔵',
};

// ─── Tech-stack testing recommendations ──────────────────────────────

const TESTING_RECOMMENDATIONS = {
  'Node.js': [
    '**Jest** — Unit & integration tests for Node.js modules',
    '**Supertest** — HTTP endpoint integration testing',
    '**c8** or **istanbul** — Code coverage reporting',
  ],
  JavaScript: [
    '**Jest** — Comprehensive JS test runner with built-in assertions',
    '**ESLint** — Static analysis to catch bugs before runtime',
  ],
  TypeScript: [
    '**Jest + ts-jest** — Type-safe unit testing',
    '**tsc --noEmit** — Compile-time type checking in CI',
  ],
  React: [
    '**Vitest** — Fast Vite-native test runner for React projects',
    '**React Testing Library** — Component-level UI testing',
    '**Playwright** or **Cypress** — End-to-end browser testing',
  ],
  Vue: [
    '**Vitest** — Vite-native testing for Vue 3',
    '**Vue Test Utils** — Component mount & assertion helpers',
  ],
  Python: [
    '**pytest** — Flexible Python test framework',
    '**pytest-cov** — Coverage reporting',
    '**bandit** — Security linting for Python',
    '**mypy** — Static type checking',
  ],
  Flask: [
    '**pytest + pytest-flask** — Flask app testing',
    '**factory_boy** — Test fixture generation',
  ],
  Django: [
    '**pytest-django** — Django-aware test runner',
    '**coverage.py** — Test coverage tracking',
  ],
  Express: [
    '**Supertest** — Express route testing without a running server',
    '**Jest** — Assertion library and test runner',
  ],
  Docker: [
    '**Container Structure Tests** — Validate Dockerfile output',
    '**docker-compose config** — Validate compose files',
  ],
};

// ─── Security hygiene tips ───────────────────────────────────────────

const SECURITY_TIPS = [
  'Keep all dependencies up to date — run `npm audit` / `pip-audit` regularly',
  'Never commit secrets, API keys, or credentials to version control',
  'Use environment variables or a secrets manager for sensitive configuration',
  'Enable branch protection and require code reviews for main branches',
  'Set up automated security scanning in your CI/CD pipeline (e.g. Snyk, Dependabot)',
  'Use HTTPS everywhere and enforce TLS for all API endpoints',
  'Implement rate limiting on public-facing APIs',
  'Apply the principle of least privilege for database and cloud credentials',
  'Regularly rotate secrets and access tokens',
  'Use Content Security Policy (CSP) headers to mitigate XSS attacks',
];

// ─── Helper functions ────────────────────────────────────────────────

function emoji(severity) {
  return SEVERITY_EMOJI[severity] || '⚪';
}

/**
 * Detect package managers from metadata.
 */
function detectPackageManagers(meta) {
  const managers = [];
  const langs = (meta.languages || []).map(l => l.toLowerCase());
  const frameworks = (meta.frameworks || []).map(f => f.toLowerCase());

  if (langs.includes('javascript') || langs.includes('typescript') || frameworks.some(f => ['react', 'vue', 'express', 'next.js', 'vite'].includes(f))) {
    managers.push('npm / yarn');
  }
  if (langs.includes('python') || frameworks.some(f => ['flask', 'django', 'fastapi'].includes(f))) {
    managers.push('pip / poetry');
  }
  if (langs.includes('java') || langs.includes('kotlin')) {
    managers.push('Maven / Gradle');
  }
  if (langs.includes('go')) {
    managers.push('Go Modules');
  }
  if (langs.includes('ruby')) {
    managers.push('Bundler');
  }
  if (langs.includes('rust')) {
    managers.push('Cargo');
  }

  return managers.length > 0 ? managers.join(', ') : 'Unknown';
}

/**
 * Get the top N most critical findings (vulns + bugs) sorted by severity.
 */
function getTopFindings(vulnerabilities, bugs, n = 3) {
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  const all = [
    ...vulnerabilities.map(v => ({ ...v, type: 'Vulnerability' })),
    ...bugs.map(b => ({ ...b, type: 'Bug' })),
  ];

  return all
    .sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5))
    .slice(0, n);
}

/**
 * Determine the final recommendation verdict.
 */
function getVerdict(vulnerabilities, bugs) {
  const hasHigh = vulnerabilities.some(v => v.severity === 'HIGH' || v.severity === 'CRITICAL');
  const hasMedium = [...vulnerabilities, ...bugs].some(f => f.severity === 'MEDIUM');

  if (hasHigh) {
    return '🔴 **Immediate action required** — High/critical severity vulnerabilities detected. Address these before deploying to production.';
  }
  if (hasMedium) {
    return '🟠 **Review before production** — Medium severity issues found. Schedule fixes before your next release.';
  }
  return '🟢 **Good shape, minor improvements suggested** — No high-severity issues found. Address low-severity items at your convenience.';
}

/**
 * Build per-tech-stack testing recommendations.
 */
function buildTestingRecommendations(meta) {
  const matched = new Set();
  const recommendations = [];

  const allTechs = [...(meta.languages || []), ...(meta.frameworks || [])];

  for (const tech of allTechs) {
    // Try exact match first, then case-insensitive
    const key = Object.keys(TESTING_RECOMMENDATIONS).find(
      k => k.toLowerCase() === tech.toLowerCase()
    );
    if (key && !matched.has(key)) {
      matched.add(key);
      recommendations.push({ tech: key, items: TESTING_RECOMMENDATIONS[key] });
    }
  }

  // Always include Docker if detected
  if (meta.hasDocker && !matched.has('Docker')) {
    recommendations.push({ tech: 'Docker', items: TESTING_RECOMMENDATIONS.Docker });
  }

  return recommendations;
}

// ─── Escape pipe characters in table cells ──────────────────────────

function escapeCell(text) {
  if (!text) return '';
  return String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

// ─── Main formatter ─────────────────────────────────────────────────

/**
 * Format a complete scan result into a structured Markdown report.
 *
 * @param {object} scanResult
 * @returns {string} Markdown report
 */
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

  const meta = repoMetadata;
  const date = timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString();
  let md = '';

  // ── 1. Title & Metadata ────────────────────────────────────────
  md += `# 🛡️ RepoPilot Security & Code Quality Report\n\n`;
  md += `**Generated:** ${date}  \n`;
  md += `**Scan ID:** \`${scanId}\`  \n`;
  if (scanDuration) {
    md += `**Scan Duration:** ${(scanDuration / 1000).toFixed(1)}s  \n`;
  }
  md += `**Repository:** ${meta.name || 'Unknown'}  \n\n`;
  md += `---\n\n`;

  // ── 2. Executive Summary ───────────────────────────────────────
  md += `## 📊 Executive Summary\n\n`;

  const highVulns = vulnerabilities.filter(v => v.severity === 'HIGH' || v.severity === 'CRITICAL');
  const highestSeverity = highVulns.length > 0 ? 'HIGH/CRITICAL' : (
    vulnerabilities.length > 0 || bugs.length > 0 ? 'MEDIUM/LOW' : 'NONE'
  );

  md += `- **${vulnerabilities.length}** security vulnerabilities found`;
  if (highVulns.length > 0) {
    md += ` (${highVulns.length} high/critical)`;
  }
  md += `\n`;
  md += `- **${bugs.length}** code quality issues detected\n`;
  md += `- **Highest severity:** ${highestSeverity}\n`;

  // Dynamic: top 3 most critical findings
  const topFindings = getTopFindings(vulnerabilities, bugs, 3);
  if (topFindings.length > 0) {
    md += `\n**Top Critical Findings:**\n`;
    topFindings.forEach((f, i) => {
      md += `${i + 1}. ${emoji(f.severity)} **[${f.severity}]** ${f.type}: ${escapeCell(f.issue || f.title || 'Unknown issue')}\n`;
    });
  }
  md += `\n`;

  // Summary table
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| 🔒 Vulnerabilities | ${vulnerabilities.length} |\n`;
  md += `| 🐛 Bugs / Code Quality | ${bugs.length} |\n`;
  md += `| 💡 Suggested Fixes | ${suggestedFixes.length} |\n`;
  md += `| ⚠️ Warnings | ${warnings.length} |\n`;
  md += `| 📁 Total Files | ${meta.fileCount || 0} |\n`;
  md += `| 📝 Lines of Code | ${(meta.totalLines || 0).toLocaleString()} |\n\n`;

  // ── 3. Repository Overview ─────────────────────────────────────
  md += `## 📦 Repository Overview\n\n`;
  md += `| Property | Value |\n`;
  md += `|----------|-------|\n`;
  md += `| **Name** | ${meta.name || 'Unknown'} |\n`;
  md += `| **Languages** | ${(meta.languages || []).join(', ') || 'Unknown'} |\n`;
  md += `| **Frameworks** | ${(meta.frameworks || []).join(', ') || 'None detected'} |\n`;
  md += `| **Package Manager** | ${detectPackageManagers(meta)} |\n`;
  md += `| **Total Files** | ${meta.fileCount || 0} |\n`;
  md += `| **Lines of Code** | ${(meta.totalLines || 0).toLocaleString()} |\n`;
  md += `| **Docker** | ${meta.hasDocker ? '✅ Yes' : '❌ No'} |\n`;
  md += `| **Tests** | ${meta.hasTests ? '✅ Yes' : '❌ No'} |\n\n`;

  // ── 4. Architecture Diagram (Mermaid) ──────────────────────────
  md += `## 🏗️ Architecture Overview\n\n`;
  md += '```mermaid\n';
  md += `graph TB\n`;
  md += `    A["🌐 Frontend<br/>React + TypeScript"] --> B["🔌 Backend API<br/>Express + Node.js"]\n`;
  md += `    B --> C["⚙️ Middleware<br/>Orchestration Layer"]\n`;
  md += `    C --> D["🤖 Analysis Agents"]\n`;
  md += `    D --> D1["📝 README Generator"]\n`;
  md += `    D --> D2["🔒 Vulnerability Scanner"]\n`;
  md += `    D --> D3["🐛 Bug Scanner"]\n`;
  md += `    D --> D4["📊 Report Generator"]\n`;
  md += `    C --> E["💾 /tmp Storage<br/>JSON + Markdown"]\n`;
  md += '```\n\n';

  // ── 5. Generated README ────────────────────────────────────────
  md += `## 📝 Generated README\n\n`;
  if (readme.content) {
    md += `${readme.content}\n\n`;
  } else {
    md += `_No README was generated for this repository._\n\n`;
  }

  // ── 6. Vulnerability Findings ──────────────────────────────────
  md += `## 🔒 Security Vulnerabilities (${vulnerabilities.length})\n\n`;
  if (vulnerabilities.length === 0) {
    md += `✅ No vulnerabilities detected. Great job!\n\n`;
  } else {
    md += `| Severity | Tool | File | Issue | Recommendation |\n`;
    md += `|----------|------|------|-------|----------------|\n`;
    vulnerabilities.forEach(vuln => {
      md += `| ${emoji(vuln.severity)} ${vuln.severity} | ${escapeCell(vuln.tool)} | \`${escapeCell(vuln.file)}\` | ${escapeCell(vuln.issue || vuln.title)} | ${escapeCell(vuln.recommendation)} |\n`;
    });
    md += `\n`;
  }

  // ── 7. Bug & Code Quality Findings ─────────────────────────────
  md += `## 🐛 Bug & Code Quality Findings (${bugs.length})\n\n`;
  if (bugs.length === 0) {
    md += `✨ No code quality issues detected. Excellent!\n\n`;
  } else {
    md += `| Severity | Tool | File | Issue | Recommendation |\n`;
    md += `|----------|------|------|-------|----------------|\n`;
    bugs.forEach(bug => {
      md += `| ${emoji(bug.severity)} ${bug.severity} | ${escapeCell(bug.tool)} | \`${escapeCell(bug.file)}\` | ${escapeCell(bug.issue || bug.title)} | ${escapeCell(bug.recommendation)} |\n`;
    });
    md += `\n`;
  }

  // ── 8. Suggested Fixes ─────────────────────────────────────────
  md += `## 💡 Suggested Fixes\n\n`;
  if (suggestedFixes.length === 0) {
    md += `✅ No fixes needed. Your repository is in great shape!\n\n`;
  } else {
    suggestedFixes.forEach((fix, i) => {
      md += `${i + 1}. ${fix}\n`;
    });
    md += `\n`;
  }

  // ── 9. Testing Recommendations ─────────────────────────────────
  md += `## 🧪 Testing Recommendations\n\n`;
  const testRecs = buildTestingRecommendations(meta);
  if (testRecs.length > 0) {
    testRecs.forEach(({ tech, items }) => {
      md += `### ${tech}\n`;
      items.forEach(item => {
        md += `- ${item}\n`;
      });
      md += `\n`;
    });
  } else {
    md += `- Add unit tests covering critical business logic\n`;
    md += `- Set up a CI/CD pipeline with automated test execution\n`;
    md += `- Aim for ≥80% code coverage on critical modules\n\n`;
  }

  // ── 10. Security Notes ─────────────────────────────────────────
  md += `## 🔐 Security Notes\n\n`;
  SECURITY_TIPS.forEach(tip => {
    md += `- ${tip}\n`;
  });
  md += `\n`;

  // ── 11. Warnings ───────────────────────────────────────────────
  if (warnings.length > 0) {
    md += `## ⚠️ Warnings\n\n`;
    warnings.forEach(w => {
      md += `- ${w}\n`;
    });
    md += `\n`;
  }

  // ── 12. Final Recommendation ───────────────────────────────────
  md += `## 🎯 Final Recommendation\n\n`;
  md += `${getVerdict(vulnerabilities, bugs)}\n\n`;

  // ── Footer ─────────────────────────────────────────────────────
  md += `---\n\n`;
  md += `*Report generated by [RepoPilot](https://github.com) — AI-Powered Repository Analysis*  \n`;
  md += `*Scan ID: \`${scanId}\`*\n`;

  return md;
};
