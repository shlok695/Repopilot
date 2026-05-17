import fs from 'fs';
import path from 'path';
import { spawnWithTimeout } from '../middleware/timeoutManager.js';
import { sanitizeScannerOutput } from '../middleware/sanitizeOutput.js';

/**
 * Check if gitleaks is available
 */
const isGitleaksAvailable = async () => {
  try {
    const result = await spawnWithTimeout('gitleaks', ['version'], process.cwd(), 2000);
    return result.code === 0;
  } catch (error) {
    return false;
  }
};

/**
 * Run gitleaks scan
 */
const runGitleaksScan = async (repoPath) => {
  const findings = [];
  const warnings = [];

  try {
    const result = await spawnWithTimeout(
      'gitleaks',
      ['detect', '--source', repoPath, '--no-git', '-f', 'json'],
      repoPath,
      30000
    );

    // Gitleaks returns exit code 1 when secrets are found
    if (result.code === 0 || result.code === 1) {
      try {
        const output = result.stdout || '[]';
        const secrets = JSON.parse(output);

        secrets.forEach(secret => {
          findings.push({
            severity: 'HIGH',
            tool: 'gitleaks',
            file: secret.File || 'unknown',
            line: secret.StartLine || 0,
            issue: `Secret detected: ${secret.RuleID || 'unknown rule'}`,
            recommendation: `Remove hardcoded secret and use environment variables or secret management service`,
            // NEVER include the actual secret value
            metadata: {
              ruleId: secret.RuleID,
              commit: 'N/A', // no-git mode
            },
          });
        });

        if (secrets.length > 0) {
          warnings.push(`Gitleaks found ${secrets.length} potential secrets`);
        }
      } catch (parseError) {
        warnings.push(`Failed to parse gitleaks output: ${parseError.message}`);
      }
    } else {
      warnings.push(`Gitleaks exited with code ${result.code}`);
    }
  } catch (error) {
    warnings.push(`Gitleaks scan failed: ${error.message}`);
  }

  return { findings, warnings };
};

/**
 * Calculate Shannon entropy of a string
 */
const calculateEntropy = (str) => {
  const len = str.length;
  const frequencies = {};
  
  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  
  let entropy = 0;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
};

/**
 * Check if file should be excluded from scanning
 */
const shouldExcludeFile = (filePath, repoPath = '') => {
  const fileName = path.basename(filePath);
  const relativePath = repoPath
    ? path.relative(repoPath, filePath)
    : filePath;
  const normalizedRelativePath = relativePath.replace(/\\/g, '/');
  const dirName = path.dirname(normalizedRelativePath).replace(/\\/g, '/');
  
  // Exclude test files
  if (fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.includes('_test.') ||
      fileName.endsWith('_test.py') ||
      fileName.endsWith('.test.js') ||
      fileName.endsWith('.test.ts') ||
      dirName.includes('__tests__') ||
      normalizedRelativePath.startsWith('test/') ||
      normalizedRelativePath.startsWith('tests/') ||
      normalizedRelativePath.includes('/test/') ||
      normalizedRelativePath.includes('/tests/')) {
    return true;
  }
  
  // Exclude .env.example files (should have placeholders)
  if (fileName === '.env.example' ||
      fileName === '.env.sample' ||
      fileName === '.env.template' ||
      fileName === 'env.example') {
    return true;
  }
  
  return false;
};

/**
 * Pattern-based secret detection (fallback)
 */
const runPatternScan = async (repoPath) => {
  const findings = [];
  const warnings = [];

  // Patterns to detect
  const patterns = [
    {
      name: 'API Key',
      regex: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*['"]?([A-Za-z0-9_\-]{20,})['"]?/gi,
      severity: 'HIGH',
    },
    {
      name: 'Password',
      regex: /(?:password|passwd|pwd)\s*[=:]\s*['"]?([^'"\s]{8,})['"]?/gi,
      severity: 'HIGH',
    },
    {
      name: 'Bearer Token',
      regex: /Bearer\s+([A-Za-z0-9_\-\.]{20,})/gi,
      severity: 'HIGH',
    },
    {
      name: 'Private Key',
      regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
      severity: 'CRITICAL',
    },
    {
      name: 'AWS Access Key',
      regex: /(?:AKIA|A3T|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
      severity: 'CRITICAL',
    },
    {
      name: 'GitHub Token',
      regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
      severity: 'CRITICAL',
    },
    {
      name: 'Slack Token',
      regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,}/g,
      severity: 'HIGH',
    },
    {
      name: 'Database Connection String',
      regex: /(?:mongodb|mysql|postgresql|postgres):\/\/[^\s'"]+/gi,
      severity: 'HIGH',
    },
    {
      name: 'High Entropy String',
      regex: /(?:const|let|var|=)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*['"]([A-Za-z0-9+/=_\-]{40,})['"]|[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*['"]([A-Za-z0-9+/=_\-]{40,})['"]/g,
      severity: 'MEDIUM',
      checkEntropy: true,
    },
  ];

  // File extensions to scan
  const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.env', '.json', '.yaml', '.yml', '.config.js'];

  // Walk directory
  const walkDir = (dir, fileList = []) => {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      // Skip node_modules, .git, dist, build directories
      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'].includes(file)) {
          walkDir(filePath, fileList);
        }
      } else {
        const ext = path.extname(file);
        if (extensions.includes(ext) || file === '.env' || file.startsWith('.env.')) {
          fileList.push(filePath);
        }
      }
    });

    return fileList;
  };

  try {
    const files = walkDir(repoPath);
    let scannedFiles = 0;
    let skippedFiles = 0;

    files.forEach(filePath => {
      try {
        // Skip excluded files (test files, .env.example, etc.)
        if (shouldExcludeFile(filePath, repoPath)) {
          skippedFiles++;
          return;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(repoPath, filePath);

        patterns.forEach(pattern => {
          lines.forEach((line, lineIndex) => {
            // Skip comments
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
              return;
            }

            // Reset regex lastIndex
            pattern.regex.lastIndex = 0;
            const matches = pattern.regex.exec(line);

            if (matches) {
              // Additional validation for API keys
              if (pattern.name === 'API Key') {
                const value = matches[1];
                // Skip if it's an environment variable reference
                if (value.startsWith('$') || value.startsWith('process.env') || value === 'YOUR_API_KEY') {
                  return;
                }
              }

              // Additional validation for passwords
              if (pattern.name === 'Password') {
                const value = matches[1];
                // Skip common placeholders
                if (['password', 'changeme', 'secret', '123456', 'admin'].includes(value.toLowerCase())) {
                  return;
                }
              }

              // High entropy string validation
              if (pattern.checkEntropy) {
                const value = matches[1] || matches[2];
                if (!value) return;
                
                // Skip if it's a common placeholder or URL
                if (value.includes('example.com') ||
                    value.includes('localhost') ||
                    value.includes('YOUR_') ||
                    value.includes('REPLACE_') ||
                    value === 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
                  return;
                }
                
                const entropy = calculateEntropy(value);
                
                // Only flag if entropy > 4.5 (indicates randomness)
                if (entropy <= 4.5) {
                  return;
                }
              }

              findings.push({
                severity: pattern.severity,
                tool: 'pattern-scan',
                file: relativePath,
                line: lineIndex + 1,
                issue: `Potential ${pattern.name} detected`,
                recommendation: `Remove hardcoded secret from source code. Use environment variables or a secret management service.`,
                // NEVER include the actual matched value
              });
            }
          });
        });

        scannedFiles++;
      } catch (error) {
        skippedFiles++;
      }
    });

    warnings.push(`Pattern scan: ${scannedFiles} files scanned, ${skippedFiles} skipped`);

  } catch (error) {
    warnings.push(`Pattern scan failed: ${error.message}`);
  }

  return { findings, warnings };
};

/**
 * Deduplicate findings by file + line + issue
 */
const deduplicateFindings = (findings) => {
  const seen = new Set();
  return findings.filter(finding => {
    const key = `${finding.file}:${finding.line}:${finding.issue}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/**
 * Scan for secrets in repository
 */
export async function scanSecrets(repoPath, repoMetadata) {
  let findings = [];
  let warnings = [];

  // Check if gitleaks is available
  const hasGitleaks = await isGitleaksAvailable();

  if (hasGitleaks) {
    warnings.push('Running gitleaks scan...');
    const gitleaksResult = await runGitleaksScan(repoPath);
    findings.push(...gitleaksResult.findings);
    warnings.push(...gitleaksResult.warnings);
  } else {
    warnings.push('Gitleaks not installed, using pattern-based detection only');
  }

  // Always run pattern scan as additional coverage
  warnings.push('Running pattern-based secret detection...');
  const patternResult = await runPatternScan(repoPath);
  findings.push(...patternResult.findings);
  warnings.push(...patternResult.warnings);

  // Deduplicate findings
  findings = deduplicateFindings(findings);

  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Cap at 50 findings
  if (findings.length > 50) {
    warnings.push(`Found ${findings.length} secrets, showing top 50`);
    findings = findings.slice(0, 50);
  }

  // CRITICAL: Sanitize all findings to ensure no actual secrets are included
  findings = findings.map(finding => {
    return {
      ...finding,
      issue: sanitizeScannerOutput(finding.issue),
      recommendation: sanitizeScannerOutput(finding.recommendation),
      file: sanitizeScannerOutput(finding.file),
    };
  });

  return {
    findings,
    warnings,
  };
}

// Made with Bob
