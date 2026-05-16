import { readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const findTestFiles = async (repoPath) => {
  const testFiles = [];
  
  const scanDir = async (dir, depth = 0) => {
    if (depth > 5) return; // Limit recursion depth
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath, depth + 1);
        } else if (
          entry.name.includes('.test.') ||
          entry.name.includes('.spec.') ||
          entry.name.includes('_test.') ||
          entry.name.startsWith('test_')
        ) {
          testFiles.push(fullPath.replace(repoPath, ''));
        }
      }
    } catch {
      // Ignore directory errors
    }
  };

  await scanDir(repoPath);
  return testFiles;
};

export const checkTestCoverage = async (repoPath, repoMetadata) => {
  const findings = [];
  
  // Check for test directories
  const testDirs = ['test', 'tests', '__tests__', 'spec'];
  const hasTestDir = testDirs.some(dir => existsSync(join(repoPath, dir)));
  
  // Find test files
  const testFiles = await findTestFiles(repoPath);
  const testFilesCount = testFiles.length;
  
  // Check for coverage configuration
  const coverageConfigs = [
    'jest.config.js',
    'jest.config.ts',
    '.coveragerc',
    'pytest.ini',
    'coverage.json',
  ];
  const hasCoverageConfig = coverageConfigs.some(config => existsSync(join(repoPath, config)));
  
  // Generate findings
  if (!hasTestDir && testFilesCount === 0) {
    findings.push({
      severity: 'MEDIUM',
      category: 'Testing',
      issue: 'No test directory or test files detected',
      recommendation: 'Add unit tests to improve code quality and catch bugs early',
    });
  } else if (testFilesCount < 5) {
    findings.push({
      severity: 'LOW',
      category: 'Testing',
      issue: `Only ${testFilesCount} test file${testFilesCount !== 1 ? 's' : ''} found`,
      recommendation: 'Consider adding more comprehensive test coverage',
    });
  }
  
  if (!hasCoverageConfig && testFilesCount > 0) {
    findings.push({
      severity: 'INFO',
      category: 'Testing',
      issue: 'No test coverage configuration detected',
      recommendation: 'Add coverage reporting to track test effectiveness',
    });
  }

  return {
    findings,
    testFilesCount,
    hasTestDir,
    hasCoverageConfig,
    testFiles: testFiles.slice(0, 10), // Limit to 10 examples
  };
};

// Made with Bob
