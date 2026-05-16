export const generateSuggestedFixes = (vulnerabilities = [], bugs = []) => {
  const fixes = new Set();

  // Map HIGH severity vulnerabilities to specific fixes
  vulnerabilities
    .filter(v => v.severity === 'HIGH')
    .forEach(vuln => {
      if (vuln.issue.toLowerCase().includes('dependency') || vuln.issue.toLowerCase().includes('package')) {
        fixes.add('Update all dependencies to their latest secure versions using npm audit fix or pip-audit');
      }
      if (vuln.issue.toLowerCase().includes('secret') || vuln.issue.toLowerCase().includes('key')) {
        fixes.add('Move all secrets, API keys, and credentials to environment variables');
      }
      if (vuln.issue.toLowerCase().includes('injection') || vuln.issue.toLowerCase().includes('sql')) {
        fixes.add('Implement parameterized queries and input validation for all database operations');
      }
      if (vuln.issue.toLowerCase().includes('xss') || vuln.issue.toLowerCase().includes('cross-site')) {
        fixes.add('Sanitize all user inputs and implement Content Security Policy (CSP) headers');
      }
    });

  // Map MEDIUM severity bugs to specific fixes
  bugs
    .filter(b => b.severity === 'MEDIUM')
    .forEach(bug => {
      if (bug.issue.toLowerCase().includes('unused')) {
        fixes.add('Remove unused variables, imports, and dead code to improve maintainability');
      }
      if (bug.issue.toLowerCase().includes('complexity')) {
        fixes.add('Refactor complex functions into smaller, more manageable units');
      }
      if (bug.issue.toLowerCase().includes('test') || bug.issue.toLowerCase().includes('coverage')) {
        fixes.add('Increase test coverage by adding unit tests for critical functions');
      }
    });

  // Always include these generic best practices
  fixes.add('Add input validation for all user-facing endpoints and functions');
  fixes.add('Implement proper error handling and logging throughout the application');
  fixes.add('Review and update security dependencies regularly using automated tools');

  return Array.from(fixes);
};

// Made with Bob
