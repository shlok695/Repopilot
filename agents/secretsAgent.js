import { spawnWithTimeout } from '../middleware/timeoutManager.js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'Generic API Key', regex: /api[_-]?key[_-]?[=:]\s*['"]?[a-zA-Z0-9]{20,}['"]?/gi },
  { name: 'Password in Code', regex: /password[_-]?[=:]\s*['"]?[^\s'"]{8,}['"]?/gi },
  { name: 'Private Key', regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi },
  { name: 'JWT Token', regex: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
];

const runGitleaks = async (repoPath) => {
  try {
    const { stdout } = await spawnWithTimeout('gitleaks', ['detect', '--no-git', '--report-format', 'json', '--report-path', '/dev/stdout'], repoPath, 15000);
    const result = JSON.parse(stdout);
    
    const findings = result.map(r => ({
      severity: 'HIGH',
      tool: 'gitleaks',
      file: r.File,
      issue: `Potential secret detected: ${r.RuleID}`,
      recommendation: 'Remove secret and rotate credentials immediately',
    }));
    
    return { findings, warnings: [] };
  } catch (error) {
    return { findings: [], warnings: ['gitleaks not available'] };
  }
};

const fallbackSecretScan = async (repoPath) => {
  const findings = [];
  const warnings = ['Using fallback pattern scanning for secrets'];

  const scanFile = async (filePath) => {
    try {
      const content = await readFile(filePath, 'utf-8');
      
      SECRET_PATTERNS.forEach(({ name, regex }) => {
        const matches = content.match(regex);
        if (matches && matches.length > 0) {
          findings.push({
            severity: 'HIGH',
            tool: 'pattern-scan',
            file: filePath.replace(repoPath, ''),
            issue: `${name} detected (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
            recommendation: 'Remove secret from code and use environment variables',
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
        } else if (!entry.name.endsWith('.jpg') && !entry.name.endsWith('.png')) {
          await scanFile(fullPath);
        }
      }
    } catch {
      // Ignore directory errors
    }
  };

  await scanDir(repoPath);
  
  return { findings: findings.slice(0, 10), warnings }; // Limit to 10
};

export const scanSecrets = async (repoPath, repoMetadata) => {
  // Try gitleaks first
  const gitleaksResult = await runGitleaks(repoPath);
  
  if (gitleaksResult.findings.length > 0) {
    return gitleaksResult;
  }

  // Fallback to pattern scanning
  return await fallbackSecretScan(repoPath);
};

// Made with Bob
