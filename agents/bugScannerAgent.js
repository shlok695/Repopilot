import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readdir, readFile } from 'fs/promises';
import { spawnWithTimeout } from '../middleware/timeoutManager.js';

const MAX_FINDINGS = 100;

/**
 * Generate minimal .eslintrc.json based on detected framework
 */
const generateEslintConfig = (repoPath, repoMetadata) => {
  const eslintrcPath = join(repoPath, '.eslintrc.json');
  
  // Don't overwrite existing config
  if (existsSync(eslintrcPath)) {
    return false;
  }

  const { detectedFrameworks = [], techStack = [] } = repoMetadata;
  
  let config = {
    env: {
      es2021: true,
      node: true,
    },
    extends: ['eslint:recommended'],
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'no-debugger': 'error',
    },
  };

  // React configuration
  if (detectedFrameworks.includes('React') || detectedFrameworks.includes('Next.js')) {
    config.env.browser = true;
    config.extends.push('plugin:react/recommended');
    config.parserOptions.ecmaFeatures = { jsx: true };
    config.settings = {
      react: { version: 'detect' },
    };
  }

  // TypeScript configuration
  if (techStack.includes('TypeScript')) {
    config.parser = '@typescript-eslint/parser';
    config.extends.push('plugin:@typescript-eslint/recommended');
    config.plugins = ['@typescript-eslint'];
  }

  // Vue configuration
  if (detectedFrameworks.includes('Vue')) {
    config.extends.push('plugin:vue/vue3-recommended');
  }

  try {
    writeFileSync(eslintrcPath, JSON.stringify(config, null, 2));
    return true;
  } catch {
    return false;
  }
};

/**
 * Run eslint for JavaScript/TypeScript
 */
const runEslint = async (repoPath, repoMetadata) => {
  const packageJsonPath = join(repoPath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return { findings: [], warnings: [] };
  }

  // Generate .eslintrc.json if it doesn't exist
  const configGenerated = generateEslintConfig(repoPath, repoMetadata);

  try {
    const { stdout } = await spawnWithTimeout(
      'npx', 
      ['eslint', '.', '--format', 'json', '--no-eslintrc'].concat(
        configGenerated ? ['--config', '.eslintrc.json'] : []
      ), 
      repoPath, 
      30000
    );
    const result = JSON.parse(stdout);
    
    const findings = [];
    result.forEach(file => {
      file.messages?.forEach(msg => {
        if (msg.severity === 2) { // Error level
          findings.push({
            severity: 'MEDIUM',
            tool: 'eslint',
            file: file.filePath.replace(repoPath, '').replace(/^[/\\]/, ''),
            line: msg.line,
            issue: `${msg.ruleId || 'error'}: ${msg.message} (line ${msg.line})`,
            recommendation: msg.fix ? 'Auto-fixable with eslint --fix' : 'Review and fix manually',
          });
        }
      });
    });
    
    const warnings = configGenerated 
      ? ['Generated temporary .eslintrc.json for analysis'] 
      : [];
    
    return { findings, warnings };
  } catch (error) {
    return { 
      findings: [], 
      warnings: ['eslint not available or failed - install with: npm install -D eslint'] 
    };
  }
};

/**
 * Run ruff for Python
 */
const runRuff = async (repoPath) => {
  const requirementsPath = join(repoPath, 'requirements.txt');
  if (!existsSync(requirementsPath)) {
    return { findings: [], warnings: [] };
  }

  try {
    const { stdout } = await spawnWithTimeout(
      'ruff', 
      ['check', '.', '--output-format', 'json'], 
      repoPath, 
      30000
    );
    const result = JSON.parse(stdout);
    
    const findings = result.map(r => ({
      severity: 'MEDIUM',
      tool: 'ruff',
      file: r.filename,
      issue: `${r.code}: ${r.message} (line ${r.location?.row || '?'})`,
      recommendation: r.fix ? 'Auto-fixable with ruff --fix' : 'Review and fix manually',
    }));
    
    return { findings, warnings: [] };
  } catch (error) {
    return { 
      findings: [], 
      warnings: ['ruff not available - install with: pip install ruff'] 
    };
  }
};

/**
 * Detect missing error handling in async functions
 */
const detectMissingErrorHandling = (content, filePath) => {
  const findings = [];
  const lines = content.split('\n');
  
  // Pattern: async function without try/catch
  const asyncFunctionPattern = /async\s+(function\s+\w+|[\w]+\s*=\s*async|[\w]+\s*:\s*async)/g;
  let match;
  
  while ((match = asyncFunctionPattern.exec(content)) !== null) {
    const startIndex = match.index;
    const lineNumber = content.substring(0, startIndex).split('\n').length;
    
    // Check if there's a try/catch in the next 50 lines
    const endLine = Math.min(lineNumber + 50, lines.length);
    const functionBody = lines.slice(lineNumber - 1, endLine).join('\n');
    
    if (!functionBody.includes('try') && !functionBody.includes('catch')) {
      findings.push({
        severity: 'MEDIUM',
        tool: 'pattern-scan',
        file: filePath,
        issue: `Async function without try/catch error handling (line ${lineNumber})`,
        recommendation: 'Add try/catch block or use .catch() for error handling',
      });
    }
  }
  
  return findings;
};

/**
 * Detect console.error as only error handler
 */
const detectConsoleErrorOnly = (content, filePath) => {
  const findings = [];
  const lines = content.split('\n');
  
  // Look for catch blocks that only have console.error
  const catchPattern = /catch\s*\([^)]*\)\s*\{([^}]*)\}/g;
  let match;
  
  while ((match = catchPattern.exec(content)) !== null) {
    const catchBody = match[1].trim();
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    // Check if catch body only contains console.error
    if (catchBody.includes('console.error') && 
        !catchBody.includes('throw') && 
        !catchBody.includes('logger') &&
        !catchBody.includes('log.error') &&
        catchBody.split('\n').filter(l => l.trim() && !l.includes('console.error')).length === 0) {
      findings.push({
        severity: 'LOW',
        tool: 'pattern-scan',
        file: filePath,
        issue: `Error handler only uses console.error without proper logging (line ${lineNumber})`,
        recommendation: 'Add proper error handling with structured logging or an error tracking service',
      });
    }
  }
  
  return findings;
};

const detectEmptyCatchBlocks = (content, filePath) => {
  const findings = [];
  const catchPattern = /catch\s*\([^)]*\)\s*\{([^}]*)\}/g;
  let match;

  while ((match = catchPattern.exec(content)) !== null) {
    const bodyWithoutComments = match[1]
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();

    if (!bodyWithoutComments) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      findings.push({
        severity: 'MEDIUM',
        tool: 'pattern-scan',
        file: filePath,
        line: lineNumber,
        issue: `empty catch block detected (line ${lineNumber})`,
        recommendation: 'Handle the error, log it, rethrow it, or document why it can be ignored.',
      });
    }
  }

  return findings;
};

/**
 * Enhanced fallback pattern scan with line numbers
 */
const fallbackPatternScan = async (repoPath) => {
  const findings = [];
  const warnings = ['Using fallback pattern scanning - install linting tools for better results'];
  
  const scanFile = async (filePath, relativePath) => {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Pattern-based checks with line numbers
      const patterns = [
        { regex: /console\.log\(/g, issue: 'Console.log statement', severity: 'LOW' },
        { regex: /debugger;/g, issue: 'Debugger statement', severity: 'MEDIUM' },
        { regex: /TODO:/gi, issue: 'TODO comment', severity: 'INFO' },
        { regex: /FIXME:/gi, issue: 'FIXME comment', severity: 'LOW' },
        { regex: /HACK:/gi, issue: 'HACK comment', severity: 'MEDIUM' },
      ];

      patterns.forEach(({ regex, issue, severity }) => {
        lines.forEach((line, index) => {
          if (regex.test(line)) {
            findings.push({
              severity,
              tool: 'pattern-scan',
              file: relativePath,
              line: index + 1,
              issue: `${issue} (line ${index + 1}): ${line.trim().substring(0, 60)}...`,
              recommendation: 'Review and clean up code',
            });
          }
        });
      });

      // Detect missing error handling
      const errorHandlingIssues = detectMissingErrorHandling(content, relativePath);
      findings.push(...errorHandlingIssues);

      // Detect console.error only handlers
      const consoleErrorIssues = detectConsoleErrorOnly(content, relativePath);
      findings.push(...consoleErrorIssues);

      const emptyCatchIssues = detectEmptyCatchBlocks(content, relativePath);
      findings.push(...emptyCatchIssues);

    } catch {
      // Ignore file read errors
    }
  };

  const scanDir = async (dir, baseDir = dir, depth = 0) => {
    if (depth > 20) {
      warnings.push(`Skipped deeply nested directory during fallback scan: ${dir}`);
      return;
    }
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }
        
        const fullPath = join(dir, entry.name);
        const relativePath = fullPath.replace(baseDir, '').replace(/^[/\\]/, '');
        
        if (entry.isDirectory()) {
          await scanDir(fullPath, baseDir, depth + 1);
        } else if (entry.name.match(/\.(js|jsx|ts|tsx|py)$/)) {
          await scanFile(fullPath, relativePath);
        }
      }
    } catch {
      // Ignore directory errors
    }
  };

  await scanDir(repoPath);
  
  return { findings, warnings };
};

/**
 * Main bug scanner function
 */
export async function scanBugs(repoPath, repoMetadata) {
  const allFindings = [];
  const allWarnings = [];
  const techStack = repoMetadata.techStack || repoMetadata.languages || [];
  const hasTestDirectory = ['test', 'tests', '__tests__'].some(dir => existsSync(join(repoPath, dir)));

  // Run eslint for JavaScript/TypeScript
  if (techStack.includes('JavaScript') || 
      techStack.includes('TypeScript') ||
      techStack.includes('Node.js')) {
    const { findings, warnings } = await runEslint(repoPath, repoMetadata);
    allFindings.push(...findings);
    allWarnings.push(...warnings);
  }

  // Run ruff for Python
  if (techStack.includes('Python')) {
    const { findings, warnings } = await runRuff(repoPath);
    allFindings.push(...findings);
    allWarnings.push(...warnings);
  }

  // Always run fallback pattern scan for additional checks
  const fallbackResult = await fallbackPatternScan(repoPath);
  allFindings.push(...fallbackResult.findings);
  if (allFindings.length === 0) {
    allWarnings.push(...fallbackResult.warnings);
  }

  if (!hasTestDirectory && (techStack.includes('JavaScript') || techStack.includes('TypeScript') || techStack.includes('Python'))) {
    allFindings.push({
      severity: 'MEDIUM',
      tool: 'pattern-scan',
      file: 'N/A',
      issue: 'No test directory found',
      recommendation: 'Add a test, tests, or __tests__ directory with automated coverage for critical paths.',
    });
  }

  // Deduplicate findings
  const uniqueFindings = [];
  const seen = new Set();
  
  allFindings.forEach(finding => {
    const key = `${finding.tool}:${finding.file}:${finding.issue}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFindings.push(finding);
    }
  });

  // Sort by severity
  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, INFO: 3 };
  uniqueFindings.sort((a, b) => {
    return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
  });

  // Cap at 100 findings
  const truncated = uniqueFindings.length > MAX_FINDINGS;
  const cappedFindings = uniqueFindings.slice(0, MAX_FINDINGS);
  
  if (truncated) {
    allWarnings.push(`Found ${uniqueFindings.length} code issues, showing top ${MAX_FINDINGS}`);
  }

  return {
    findings: cappedFindings,
    warnings: allWarnings.filter(w => w), // Remove empty warnings
  };
}

// Made with Bob
