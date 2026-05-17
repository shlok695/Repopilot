export const generateSuggestedFixes = (vulnerabilities = [], bugs = []) => {
  const fixes = new Map();

  const addFix = (title, description, extra = {}) => {
    if (!fixes.has(title)) {
      fixes.set(title, {
        title,
        description,
        ...extra,
      });
    }
  };

  // Map HIGH severity vulnerabilities to specific fixes
  vulnerabilities
    .filter(v => v.severity === 'HIGH')
    .forEach(vuln => {
      if (vuln.issue.toLowerCase().includes('dependency') || vuln.issue.toLowerCase().includes('package')) {
        addFix('Update vulnerable dependencies', 'Update all dependencies to their latest secure versions using npm audit fix or pip-audit.', {
          file: vuln.file,
          type: 'vulnerability',
          priority: 'high',
          effort: 'medium',
          relatedIssues: [vuln.issue],
        });
      }
      if (vuln.issue.toLowerCase().includes('secret') || vuln.issue.toLowerCase().includes('key')) {
        addFix('Move secrets out of source code', 'Move all secrets, API keys, and credentials to environment variables, then rotate any exposed credentials.', {
          file: vuln.file,
          type: 'vulnerability',
          priority: 'high',
          effort: 'medium',
          relatedIssues: [vuln.issue],
        });
      }
      if (vuln.issue.toLowerCase().includes('injection') || vuln.issue.toLowerCase().includes('sql')) {
        addFix('Harden database inputs', 'Implement parameterized queries and input validation for all database operations.', {
          file: vuln.file,
          type: 'vulnerability',
          priority: 'high',
          effort: 'high',
          relatedIssues: [vuln.issue],
        });
      }
      if (vuln.issue.toLowerCase().includes('xss') || vuln.issue.toLowerCase().includes('cross-site')) {
        addFix('Reduce XSS risk', 'Sanitize all user inputs and implement Content Security Policy headers.', {
          file: vuln.file,
          type: 'vulnerability',
          priority: 'high',
          effort: 'medium',
          relatedIssues: [vuln.issue],
        });
      }
    });

  // Map MEDIUM severity bugs to specific fixes
  bugs
    .filter(b => b.severity === 'MEDIUM')
    .forEach(bug => {
      if (bug.issue.toLowerCase().includes('unused')) {
        addFix('Remove unused code', 'Remove unused variables, imports, and dead code to improve maintainability.', {
          file: bug.file,
          type: 'bug',
          priority: 'medium',
          effort: 'low',
          relatedIssues: [bug.issue],
        });
      }
      if (bug.issue.toLowerCase().includes('complexity')) {
        addFix('Refactor complex functions', 'Refactor complex functions into smaller, more manageable units.', {
          file: bug.file,
          type: 'bug',
          priority: 'medium',
          effort: 'high',
          relatedIssues: [bug.issue],
        });
      }
      if (bug.issue.toLowerCase().includes('test') || bug.issue.toLowerCase().includes('coverage')) {
        addFix('Increase test coverage', 'Add unit tests for critical functions and paths that currently have weak coverage.', {
          file: bug.file,
          type: 'improvement',
          priority: 'medium',
          effort: 'medium',
          relatedIssues: [bug.issue],
        });
      }
    });

  // Always include these generic best practices
  addFix('Validate user inputs', 'Add input validation for all user-facing endpoints and functions.', {
    type: 'improvement',
    priority: 'medium',
    effort: 'medium',
    relatedIssues: [],
  });
  addFix('Improve error handling', 'Implement proper error handling and logging throughout the application.', {
    type: 'improvement',
    priority: 'medium',
    effort: 'medium',
    relatedIssues: [],
  });
  addFix('Automate dependency review', 'Review and update security dependencies regularly using automated tools.', {
    type: 'improvement',
    priority: 'low',
    effort: 'low',
    relatedIssues: [],
  });

  return Array.from(fixes.values());
};

// Made with Bob
