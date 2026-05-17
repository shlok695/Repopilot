import { generateSuggestedFixes } from '../suggestFixes.js';

describe('suggestFixes', () => {
  test('empty arrays return generic fixes only', () => {
    const fixes = generateSuggestedFixes([], []);

    expect(fixes).toHaveLength(3);
    expect(fixes).toEqual([
      expect.objectContaining({
        title: 'Validate user inputs',
        type: 'improvement',
        priority: 'medium',
        effort: 'medium',
      }),
      expect.objectContaining({
        title: 'Add or improve tests',
        type: 'improvement',
        priority: 'medium',
        effort: 'high',
        docs: 'https://jestjs.io/docs/getting-started',
      }),
      expect.objectContaining({
        title: 'Automate dependency review',
        type: 'improvement',
        priority: 'low',
        effort: 'low',
        docs: expect.stringContaining('dependabot'),
      }),
    ]);
  });

  test('HIGH npm audit vuln produces audit fix suggestion', () => {
    const vulns = [
      {
        tool: 'npm audit',
        severity: 'HIGH',
        file: 'package.json',
        issue: 'lodash: prototype pollution in lodash',
      },
    ];

    const fixes = generateSuggestedFixes(vulns, []);

    expect(fixes).toHaveLength(4);
    expect(fixes[0]).toEqual(expect.objectContaining({
      title: 'Update vulnerable dependencies',
      description: expect.stringContaining('`lodash`'),
      file: 'package.json',
      type: 'vulnerability',
      priority: 'high',
      effort: 'medium',
      docs: 'https://docs.npmjs.com/cli/commands/npm-audit',
      relatedIssues: ['lodash: prototype pollution in lodash'],
    }));
    expect(fixes.some(fix => fix.title === 'Review security finding')).toBe(false);
  });

  test('MEDIUM bugs produce corresponding suggestions', () => {
    const bugs = [
      {
        tool: 'eslint',
        severity: 'MEDIUM',
        file: 'src/app.js',
        issue: "'unusedVar' is defined but never used.",
      },
      {
        tool: 'pattern-scan',
        severity: 'MEDIUM',
        file: 'src/utils.js',
        issue: 'Async function without try/catch error handling',
      },
    ];

    const fixes = generateSuggestedFixes([], bugs);

    expect(fixes).toHaveLength(5);
    expect(fixes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: 'Remove unused code',
        file: 'src/app.js',
        type: 'bug',
        priority: 'medium',
        effort: 'low',
        docs: 'https://eslint.org/docs/latest/rules/no-unused-vars',
      }),
      expect.objectContaining({
        title: 'Improve error handling',
        file: 'src/utils.js',
        type: 'bug',
        priority: 'medium',
        effort: 'low',
      }),
    ]));
  });

  test('CRITICAL gitleaks secret produces actionable secret suggestion', () => {
    const vulns = [
      {
        tool: 'gitleaks',
        severity: 'CRITICAL',
        file: 'config.js',
        issue: 'Potential secret detected: aws-access-key',
      },
    ];

    const fixes = generateSuggestedFixes(vulns, []);

    expect(fixes[0]).toEqual(expect.objectContaining({
      title: 'Move secrets out of source code',
      description: expect.stringContaining('rotate any exposed credentials'),
      file: 'config.js',
      type: 'vulnerability',
      priority: 'high',
      effort: 'medium',
      docs: 'https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning',
      relatedIssues: ['Potential secret detected: aws-access-key'],
    }));
  });

  test('deduplicates identical fixes', () => {
    const vulns = [
      { tool: 'gitleaks', severity: 'CRITICAL', file: 'config.js', issue: 'secret A' },
      { tool: 'gitleaks', severity: 'CRITICAL', file: 'config.js', issue: 'secret B' },
    ];

    const fixes = generateSuggestedFixes(vulns, []);

    expect(fixes.filter(fix => fix.title === 'Move secrets out of source code')).toHaveLength(1);
    expect(fixes).toHaveLength(4);
  });

  test('handles null/undefined fields gracefully', () => {
    const vulns = [
      { tool: 'unknown', severity: 'HIGH', file: 'app.js' },
    ];

    const fixes = generateSuggestedFixes(vulns, []);

    expect(fixes[0]).toEqual(expect.objectContaining({
      title: 'Review security finding',
      description: 'Review and fix the security issue in `app.js`. Follow the scanner recommendation and rerun the scan.',
      file: 'app.js',
      type: 'vulnerability',
      priority: 'high',
      effort: 'medium',
      relatedIssues: [''],
    }));
  });
});
