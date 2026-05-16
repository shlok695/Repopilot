/**
 * Middleware: Suggested Fixes Generator
 * Automatically produces actionable fix suggestions from vulnerability and bug findings.
 */

/**
 * Extracts the variable name from an eslint no-unused-vars message.
 * Eslint message format usually: "'varName' is defined but never used."
 */
function extractUnusedVarName(issueStr) {
  const match = issueStr.match(/'([^']+)'/);
  return match ? match[1] : 'variable';
}

/**
 * Extracts the package name from an npm audit issue.
 */
function extractPackageName(issueStr) {
  const parts = issueStr.split(':');
  return parts[0].trim() || 'package';
}

/**
 * Generate suggested fixes based on scan findings.
 * 
 * @param {Array} vulnerabilities 
 * @param {Array} bugs 
 * @returns {Array<string>} List of deduplicated, formatted markdown strings
 */
export function generateSuggestedFixes(vulnerabilities = [], bugs = []) {
  const rawFixes = [];

  // 1. Process Vulnerabilities
  vulnerabilities.forEach(v => {
    const issueLower = (v.issue || '').toLowerCase();
    
    // npm audit High/Critical
    if (v.tool === 'npm audit' && (v.severity === 'HIGH' || v.severity === 'CRITICAL')) {
      const pkgName = extractPackageName(v.issue);
      rawFixes.push({
        category: 'Dependencies',
        severity: v.severity,
        text: `Run \`npm audit fix --force\` to patch vulnerable package \`${pkgName}\`.`,
        effort: 'Quick (< 5 min)',
        docs: 'https://docs.npmjs.com/cli/v8/commands/npm-audit'
      });
    } 
    // pip-audit
    else if (v.tool === 'pip-audit' && (v.severity === 'HIGH' || v.severity === 'CRITICAL')) {
      rawFixes.push({
        category: 'Dependencies',
        severity: v.severity,
        text: `Update vulnerable Python packages in \`${v.file}\`.`,
        effort: 'Medium (30 min)',
        docs: 'https://pypi.org/project/pip-audit/'
      });
    }
    // Secret scanning (semgrep or gitleaks)
    else if (v.tool === 'gitleaks' || issueLower.includes('secret') || issueLower.includes('hardcoded')) {
      rawFixes.push({
        category: 'Secrets',
        severity: v.severity,
        text: `Move hardcoded secret to \`.env\` and add it to \`.gitignore\` (Found in \`${v.file}\`).`,
        effort: 'Medium (30 min)',
        docs: 'https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning'
      });
    }
    else {
      // General vulnerabilities fallback
      rawFixes.push({
        category: 'Security',
        severity: v.severity,
        text: `Review and fix security issue in \`${v.file}\`. Recommendation: ${v.recommendation || 'See findings'}`,
        effort: 'Medium (30 min)',
        docs: null
      });
    }
  });

  // 2. Process Bugs & Code Quality
  bugs.forEach(b => {
    const issueLower = (b.issue || '').toLowerCase();

    // eslint no-unused-vars
    if (issueLower.includes('no-unused-vars') || issueLower.includes('is defined but never used') || issueLower.includes('unused variable')) {
      const varName = extractUnusedVarName(b.issue);
      rawFixes.push({
        category: 'Code Quality',
        severity: b.severity || 'MEDIUM',
        text: `Remove unused variable \`${varName}\` in \`${b.file}\`.`,
        effort: 'Quick (< 5 min)',
        docs: 'https://eslint.org/docs/latest/rules/no-unused-vars'
      });
    } 
    // Empty catch or missing proper error logging
    else if (issueLower.includes('empty catch') || issueLower.includes('uses console.error without proper logging') || issueLower.includes('without try/catch')) {
      rawFixes.push({
        category: 'Code Quality',
        severity: b.severity || 'MEDIUM',
        text: `Add robust error logging inside catch block in \`${b.file}\`.`,
        effort: 'Quick (< 5 min)',
        docs: 'https://eslint.org/docs/latest/rules/no-empty'
      });
    }
  });

  // 3. Add Generic Fixes (Always included)
  rawFixes.push({
    category: 'Testing',
    severity: 'LOW',
    text: 'Add a `tests/` directory with unit tests to ensure code reliability.',
    effort: 'Large (hours)',
    docs: 'https://jestjs.io/docs/getting-started'
  });
  
  rawFixes.push({
    category: 'Secrets',
    severity: 'LOW',
    text: 'Add `.env.example` to document all required environment variables safely.',
    effort: 'Quick (< 5 min)',
    docs: 'https://www.npmjs.com/package/dotenv'
  });
  
  rawFixes.push({
    category: 'Dependencies',
    severity: 'LOW',
    text: 'Enable GitHub Dependabot for automated dependency updates.',
    effort: 'Quick (< 5 min)',
    docs: 'https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuring-dependabot-version-updates'
  });

  // 4. Prioritize fixes: CRITICAL -> HIGH -> MEDIUM -> LOW -> INFO
  const severityScore = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4, INFO: 5 };
  rawFixes.sort((a, b) => {
    const scoreA = severityScore[a.severity] || 6;
    const scoreB = severityScore[b.severity] || 6;
    return scoreA - scoreB;
  });

  // 5. Deduplicate based on exact text
  const uniqueFixes = [];
  const seen = new Set();
  
  for (const f of rawFixes) {
    if (!seen.has(f.text)) {
      seen.add(f.text);
      uniqueFixes.push(f);
    }
  }

  // 6. Format into Markdown
  return uniqueFixes.map(f => {
    let md = `**[${f.category}]** `;
    
    if (f.severity === 'CRITICAL' || f.severity === 'HIGH') md += `🔴 **${f.severity}**: `;
    else if (f.severity === 'MEDIUM') md += `🟠 **${f.severity}**: `;
    else if (f.severity === 'LOW') md += `🟡 **${f.severity}**: `;
    else md += `🔵 **${f.severity}**: `;
    
    md += `${f.text} *(Effort: ${f.effort})*`;
    if (f.docs) md += ` - [Docs](${f.docs})`;
    
    return md;
  });
}
