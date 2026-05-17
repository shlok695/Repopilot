const severityPriority = {
  CRITICAL: 'high',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'low',
};

const effortForSeverity = {
  CRITICAL: 'medium',
  HIGH: 'medium',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'low',
};

function extractPackageName(issue = '') {
  const parts = issue.split(':');
  return parts[0]?.trim() || 'package';
}

export const generateSuggestedFixes = (vulnerabilities = [], bugs = []) => {
  const fixes = new Map();

  const addFix = (title, description, extra = {}) => {
    if (!fixes.has(title)) {
      fixes.set(title, {
        title,
        description,
        type: extra.type || 'improvement',
        priority: extra.priority || severityPriority[extra.severity] || 'medium',
        effort: extra.effort || effortForSeverity[extra.severity] || 'medium',
        relatedIssues: extra.relatedIssues || [],
        ...(extra.file ? { file: extra.file } : {}),
        ...(extra.docs ? { docs: extra.docs } : {}),
      });
    }
  };

  vulnerabilities.forEach(vuln => {
    const issue = vuln.issue || vuln.title || '';
    const issueLower = issue.toLowerCase();
    const severity = vuln.severity || 'MEDIUM';
    let matchedSpecificFix = false;

    if (vuln.tool === 'npm audit' || issueLower.includes('dependency') || issueLower.includes('package')) {
      const packageName = extractPackageName(issue);
      addFix(
        'Update vulnerable dependencies',
        `Update vulnerable dependency \`${packageName}\` to a secure version. Run npm audit fix, pip-audit, or the relevant package manager update command and rerun the scan.`,
        {
          file: vuln.file,
          type: 'vulnerability',
          severity,
          relatedIssues: [issue],
          docs: 'https://docs.npmjs.com/cli/commands/npm-audit',
        }
      );
      matchedSpecificFix = true;
    }

    if (vuln.tool === 'gitleaks' || issueLower.includes('secret') || issueLower.includes('hardcoded') || issueLower.includes('credential') || issueLower.includes('key')) {
      addFix(
        'Move secrets out of source code',
        'Move hardcoded secrets to environment variables or a secrets manager, add local secret files to .gitignore, and rotate any exposed credentials.',
        {
          file: vuln.file,
          type: 'vulnerability',
          severity,
          relatedIssues: [issue],
          docs: 'https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning',
        }
      );
      matchedSpecificFix = true;
    }

    if (issueLower.includes('injection') || issueLower.includes('sql')) {
      addFix(
        'Harden database inputs',
        'Replace interpolated SQL or command strings with parameterized queries, prepared statements, and input validation.',
        {
          file: vuln.file,
          type: 'vulnerability',
          severity,
          effort: 'high',
          relatedIssues: [issue],
        }
      );
      matchedSpecificFix = true;
    }

    if (issueLower.includes('xss') || issueLower.includes('cross-site') || issueLower.includes('html assignment')) {
      addFix(
        'Reduce XSS risk',
        'Use safe DOM APIs, sanitize trusted HTML before rendering, and consider adding Content Security Policy headers.',
        {
          file: vuln.file,
          type: 'vulnerability',
          severity,
          relatedIssues: [issue],
        }
      );
      matchedSpecificFix = true;
    }

    if (!matchedSpecificFix) {
      addFix(
        'Review security finding',
        `Review and fix the security issue${vuln.file ? ` in \`${vuln.file}\`` : ''}. ${vuln.recommendation || 'Follow the scanner recommendation and rerun the scan.'}`,
        {
          file: vuln.file,
          type: 'vulnerability',
          severity,
          relatedIssues: [issue],
        }
      );
    }
  });

  bugs.forEach(bug => {
    const issue = bug.issue || bug.title || '';
    const issueLower = issue.toLowerCase();
    const severity = bug.severity || 'MEDIUM';

    if (issueLower.includes('unused') || issueLower.includes('no-unused-vars')) {
      addFix(
        'Remove unused code',
        'Remove unused variables, imports, and dead code to reduce noise and improve maintainability.',
        {
          file: bug.file,
          type: 'bug',
          severity,
          effort: 'low',
          relatedIssues: [issue],
          docs: 'https://eslint.org/docs/latest/rules/no-unused-vars',
        }
      );
    }

    if (issueLower.includes('try/catch') || issueLower.includes('empty catch') || issueLower.includes('console.error') || issueLower.includes('error handling')) {
      addFix(
        'Improve error handling',
        'Add explicit error handling, structured logging, and user-safe failure paths around async or risky operations.',
        {
          file: bug.file,
          type: 'bug',
          severity,
          effort: 'low',
          relatedIssues: [issue],
        }
      );
    }

    if (issueLower.includes('complexity')) {
      addFix(
        'Refactor complex functions',
        'Break complex functions into smaller units with focused tests around each branch.',
        {
          file: bug.file,
          type: 'bug',
          severity,
          effort: 'high',
          relatedIssues: [issue],
        }
      );
    }
  });

  addFix('Validate user inputs', 'Add validation for all user-facing endpoints and functions.', {
    type: 'improvement',
    priority: 'medium',
    effort: 'medium',
  });
  addFix('Add or improve tests', 'Add unit and integration tests for critical behavior and scan high-risk paths in CI.', {
    type: 'improvement',
    priority: 'medium',
    effort: 'high',
    docs: 'https://jestjs.io/docs/getting-started',
  });
  addFix('Automate dependency review', 'Enable Dependabot or a similar tool for recurring dependency and security update checks.', {
    type: 'improvement',
    priority: 'low',
    effort: 'low',
    docs: 'https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuring-dependabot-version-updates',
  });

  return Array.from(fixes.values());
};

// Made with Bob
