import { spawnWithTimeout } from '../middleware/timeoutManager.js';
import { existsSync } from 'fs';
import { join } from 'path';
import { readdir, readFile } from 'fs/promises';

const runEslint = async (repoPath) => {
  const packageJsonPath = join(repoPath, 'package.json');
  if (!existsSync(packageJsonPath)) return { findings: [], warnings: [] };

  try {
    const { stdout } = await spawnWithTimeout('npx', ['eslint', '.', '--format', 'json'], repoPath, 15000);
    const result = JSON.parse(stdout);
    
    const findings = [];
    result.forEach(file => {
      file.messages?.forEach(msg => {
        if (msg.severity === 2) { // Error level
          findings.push({
            severity: 'MEDIUM',
            tool: 'eslint',
            file: file.filePath.replace(repoPath, ''),
            issue: msg.message,
            recommendation: msg.fix ? 'Auto-fixable with eslint --fix' : 'Review and fix manually',
          });
        }
      });
    });
    
    return { findings: findings.slice(0, 20), warnings: [] }; // Limit to 20
  } catch (error) {
    return { findings: [], warnings: ['eslint not available or failed'] };
  }
};

const runRuff = async (repoPath) => {
  const requirementsPath = join(repoPath, 'requirements.txt');
  if (!existsSync(requirementsPath)) return { findings: [], warnings: [] };

  try {
    const { stdout } = await spawnWithTimeout('ruff', ['check', '.', '--output-format', 'json'], repoPath, 15000);
    const result = JSON.parse(stdout);
    
    const findings = result.map(r => ({
      severity: 'MEDIUM',
      tool: 'ruff',
      file: r.filename,
      issue: `${r.code}: ${r.message}`,
      recommendation: r.fix ? 'Auto-fixable with ruff --fix' : 'Review and fix manually',
    }));
    
    return { findings: findings.slice(0, 20), warnings: [] }; // Limit to 20
  } catch (error) {
    return { findings: [], warnings: ['ruff not available or failed'] };
  }
};

const fallbackPatternScan = async (repoPath) => {
  const findings = [];
  const warnings = ['Using fallback pattern scanning - install linting tools for better results'];
  
  const patterns = [
    { regex: /console\.log\(/g, issue: 'Console.log statement found', severity: 'LOW' },
    { regex: /debugger;/g, issue: 'Debugger statement found', severity: 'MEDIUM' },
    { regex: /TODO:/g, issue: 'TODO comment found', severity: 'INFO' },
    { regex: /FIXME:/g, issue: 'FIXME comment found', severity: 'LOW' },
  ];

  const scanFile = async (filePath) => {
    try {
      const content = await readFile(filePath, 'utf-8');
      patterns.forEach(({ regex, issue, severity }) => {
        const matches = content.match(regex);
        if (matches && matches.length > 0) {
          findings.push({
            severity,
            tool: 'pattern-scan',
            file: filePath.replace(repoPath, ''),
            issue: `${issue} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
            recommendation: 'Review and clean up code',
          });
        }
      });
    } catch {
      // Ignore file read errors
    }
  };

  const scanDir = async (dir) => {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.py')) {
          await scanFile(fullPath);
        }
      }
    } catch {
      // Ignore directory errors
    }
  };

  await scanDir(repoPath);
  
  return { findings: findings.slice(0, 15), warnings }; // Limit to 15
};

export const scanBugs = async (repoPath, repoMetadata) => {
  const allFindings = [];
  const allWarnings = [];

  // Run eslint for JavaScript/TypeScript
  if (repoMetadata.languages.includes('JavaScript') || repoMetadata.languages.includes('TypeScript')) {
    const { findings, warnings } = await runEslint(repoPath);
    allFindings.push(...findings);
    allWarnings.push(...warnings);
  }

  // Run ruff for Python
  if (repoMetadata.languages.includes('Python')) {
    const { findings, warnings } = await runRuff(repoPath);
    allFindings.push(...findings);
    allWarnings.push(...warnings);
  }

  // If no tools worked, use fallback pattern scan
  if (allFindings.length === 0 && allWarnings.length > 0) {
    const fallbackResult = await fallbackPatternScan(repoPath);
    allFindings.push(...fallbackResult.findings);
    allWarnings.push(...fallbackResult.warnings);
  }

  return {
    findings: allFindings,
    warnings: allWarnings.filter(w => w), // Remove empty warnings
  };
};

// Made with Bob
