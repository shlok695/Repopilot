import { generateSuggestedFixes } from '../suggestFixes.js';

describe('suggestFixes', () => {

  test('empty arrays return generic fixes only', () => {
    const fixes = generateSuggestedFixes([], []);
    
    expect(fixes).toHaveLength(3); // The 3 generic ones
    
    // Prioritization guarantees Testing and Secrets are LOW, etc.
    expect(fixes[0]).toContain('**[Testing]** 🟡 **LOW**: Add a `tests/` directory');
    expect(fixes[1]).toContain('**[Secrets]** 🟡 **LOW**: Add `.env.example`');
    expect(fixes[2]).toContain('**[Dependencies]** 🟡 **LOW**: Enable GitHub Dependabot');
    
    // Check links and effort
    expect(fixes[0]).toContain('*(Effort: Large (hours))*');
    expect(fixes[1]).toContain('*(Effort: Quick (< 5 min))*');
    expect(fixes[2]).toContain('[Docs](https://docs.github.com');
  });

  test('HIGH npm audit vuln produces audit fix suggestion', () => {
    const vulns = [
      {
        tool: 'npm audit',
        severity: 'HIGH',
        file: 'package.json',
        issue: 'lodash: prototype pollution in lodash',
      }
    ];
    
    const fixes = generateSuggestedFixes(vulns, []);
    
    // 1 High + 3 Generics
    expect(fixes).toHaveLength(4);
    
    // High comes first
    expect(fixes[0]).toContain('**[Dependencies]** 🔴 **HIGH**: Run `npm audit fix --force` to patch vulnerable package `lodash`');
    expect(fixes[0]).toContain('*(Effort: Quick (< 5 min))*');
    expect(fixes[0]).toContain('[Docs](https://docs.npmjs.com/cli/v8/commands/npm-audit)');
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
      }
    ];

    const fixes = generateSuggestedFixes([], bugs);

    // 2 Mediums + 3 Generics
    expect(fixes).toHaveLength(5);
    
    // Unused var extract
    expect(fixes.some(f => f.includes('Remove unused variable `unusedVar` in `src/app.js`'))).toBe(true);
    
    // Error logging
    expect(fixes.some(f => f.includes('Add robust error logging inside catch block in `src/utils.js`'))).toBe(true);
  });

  test('CRITICAL gitleaks secret produces actionable secret suggestion', () => {
    const vulns = [
      {
        tool: 'gitleaks',
        severity: 'CRITICAL',
        file: 'config.js',
        issue: 'Potential secret detected: aws-access-key',
      }
    ];

    const fixes = generateSuggestedFixes(vulns, []);
    
    expect(fixes[0]).toContain('**[Secrets]** 🔴 **CRITICAL**: Move hardcoded secret to `.env` and add it to `.gitignore` (Found in `config.js`). *(Effort: Medium (30 min))*');
  });

  test('deduplicates identical fixes', () => {
    const vulns = [
      { tool: 'gitleaks', severity: 'CRITICAL', file: 'config.js', issue: 'secret A' },
      { tool: 'gitleaks', severity: 'CRITICAL', file: 'config.js', issue: 'secret B' }
    ];

    // Since they both map to "Move hardcoded secret to .env... (Found in config.js)"
    const fixes = generateSuggestedFixes(vulns, []);
    
    // 1 Critical + 3 Generics
    expect(fixes).toHaveLength(4); 
  });
  
  test('handles null/undefined fields gracefully', () => {
    const vulns = [
      { tool: 'unknown', severity: 'HIGH', file: 'app.js' } // missing issue and recommendation
    ];
    
    const fixes = generateSuggestedFixes(vulns, []);
    
    expect(fixes[0]).toContain('**[Security]** 🔴 **HIGH**: Review and fix security issue in `app.js`. Recommendation: See findings');
  });
});
