import fs from 'fs';
import path from 'path';
import { spawnWithTimeout } from '../middleware/timeoutManager.js';

/**
 * Check for test directories
 */
const checkTestDirectories = (repoPath) => {
  const testDirs = ['tests', 'test', '__tests__', 'spec', 'cypress', 'e2e'];
  const foundDirs = [];

  testDirs.forEach(dir => {
    const dirPath = path.join(repoPath, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      foundDirs.push(dir);
    }
  });

  return foundDirs;
};

/**
 * Check for test configuration files
 */
const checkTestConfig = (repoPath) => {
  const configFiles = [
    'jest.config.js',
    'jest.config.ts',
    'jest.config.json',
    'vitest.config.ts',
    'vitest.config.js',
    'pytest.ini',
    'setup.cfg',
    '.coveragerc',
    'karma.conf.js',
    'mocha.opts',
    '.mocharc.json',
  ];

  const foundConfigs = [];

  configFiles.forEach(file => {
    const filePath = path.join(repoPath, file);
    if (fs.existsSync(filePath)) {
      foundConfigs.push(file);
    }
  });

  // Check package.json for test script
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (packageJson.scripts && packageJson.scripts.test) {
        foundConfigs.push('package.json (test script)');
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  // Check setup.cfg for pytest
  const setupCfgPath = path.join(repoPath, 'setup.cfg');
  if (fs.existsSync(setupCfgPath)) {
    try {
      const content = fs.readFileSync(setupCfgPath, 'utf-8');
      if (content.includes('[tool:pytest]') || content.includes('[pytest]')) {
        if (!foundConfigs.includes('setup.cfg')) {
          foundConfigs.push('setup.cfg (pytest)');
        }
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  return foundConfigs;
};

/**
 * Check for coverage configuration
 */
const checkCoverageConfig = (repoPath) => {
  const hasCoverage = {
    configured: false,
    details: [],
  };

  // Check package.json for coverage script or jest config
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Check scripts for coverage
      if (packageJson.scripts) {
        if (packageJson.scripts.coverage || 
            packageJson.scripts['test:coverage'] ||
            (packageJson.scripts.test && packageJson.scripts.test.includes('--coverage'))) {
          hasCoverage.configured = true;
          hasCoverage.details.push('Coverage script in package.json');
        }
      }

      // Check jest config for coverage threshold
      if (packageJson.jest && packageJson.jest.coverageThreshold) {
        hasCoverage.configured = true;
        hasCoverage.details.push('Jest coverage threshold configured');
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  // Check jest.config.js for coverage threshold
  const jestConfigPath = path.join(repoPath, 'jest.config.js');
  if (fs.existsSync(jestConfigPath)) {
    try {
      const content = fs.readFileSync(jestConfigPath, 'utf-8');
      if (content.includes('coverageThreshold')) {
        hasCoverage.configured = true;
        hasCoverage.details.push('Jest config has coverage threshold');
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  // Check .coveragerc for Python
  const coveragercPath = path.join(repoPath, '.coveragerc');
  if (fs.existsSync(coveragercPath)) {
    hasCoverage.configured = true;
    hasCoverage.details.push('Python .coveragerc found');
  }

  // Check pytest.ini for coverage
  const pytestIniPath = path.join(repoPath, 'pytest.ini');
  if (fs.existsSync(pytestIniPath)) {
    try {
      const content = fs.readFileSync(pytestIniPath, 'utf-8');
      if (content.includes('--cov')) {
        hasCoverage.configured = true;
        hasCoverage.details.push('Pytest coverage configured');
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  return hasCoverage;
};

/**
 * Count test files
 */
const countTestFiles = (repoPath) => {
  const testFiles = [];
  
  const testPatterns = [
    /\.test\.(js|ts|jsx|tsx)$/,
    /\.spec\.(js|ts|jsx|tsx)$/,
    /_test\.py$/,
    /test_.*\.py$/,
  ];

  const walkDir = (dir, fileList = []) => {
    try {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            // Skip node_modules, .git, dist, build
            if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'].includes(file)) {
              walkDir(filePath, fileList);
            }
          } else {
            // Check if file matches test pattern
            if (testPatterns.some(pattern => pattern.test(file))) {
              fileList.push(path.relative(repoPath, filePath));
            }
          }
        } catch (error) {
          // Skip files we can't access
        }
      });
    } catch (error) {
      // Skip directories we can't access
    }

    return fileList;
  };

  return walkDir(repoPath);
};

/**
 * Count source files
 */
const countSourceFiles = (repoPath) => {
  let count = 0;
  
  const sourcePatterns = [
    /\.(js|ts|jsx|tsx|py)$/,
  ];

  const walkDir = (dir) => {
    try {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            // Only count src/, lib/, app/ directories
            if (['src', 'lib', 'app'].includes(file)) {
              walkDir(filePath);
            }
          } else {
            // Check if file matches source pattern
            if (sourcePatterns.some(pattern => pattern.test(file))) {
              count++;
            }
          }
        } catch (error) {
          // Skip files we can't access
        }
      });
    } catch (error) {
      // Skip directories we can't access
    }
  };

  walkDir(repoPath);
  return count;
};

/**
 * Run test script with coverage
 */
const runTestsWithCoverage = async (repoPath) => {
  const result = {
    ran: false,
    coveragePercent: null,
    output: '',
  };

  try {
    // Check if package.json has test script
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return result;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (!packageJson.scripts || !packageJson.scripts.test) {
      return result;
    }

    // Run npm test with coverage and passWithNoTests
    const { stdout, stderr, code } = await spawnWithTimeout(
      'npm',
      ['test', '--', '--coverage', '--passWithNoTests', '--silent'],
      repoPath,
      30000
    );

    result.ran = true;
    result.output = stdout + stderr;

    // Parse coverage percentage from output
    // Jest format: "All files | 85.5 | 80.2 | 90.1 | 85.5 |"
    // Look for percentage patterns
    const coveragePatterns = [
      /All files\s*\|\s*(\d+\.?\d*)/i,
      /Statements\s*:\s*(\d+\.?\d*)%/i,
      /Coverage\s*:\s*(\d+\.?\d*)%/i,
      /Total\s*:\s*(\d+\.?\d*)%/i,
    ];

    for (const pattern of coveragePatterns) {
      const match = result.output.match(pattern);
      if (match && match[1]) {
        result.coveragePercent = parseFloat(match[1]);
        break;
      }
    }

  } catch (error) {
    // Test run failed or timed out - this is okay
    result.output = error.message;
  }

  return result;
};

/**
 * Recommend testing tools based on project type
 */
const recommendTestingTools = (repoMetadata) => {
  const recommendations = [];

  // Check for React
  if (repoMetadata.frameworks && repoMetadata.frameworks.includes('React')) {
    recommendations.push('Jest with React Testing Library for React components');
  }

  // Check for Vite
  if (repoMetadata.frameworks && repoMetadata.frameworks.includes('Vite')) {
    recommendations.push('Vitest for Vite projects (faster than Jest)');
  }

  // Check for Next.js
  if (repoMetadata.frameworks && repoMetadata.frameworks.includes('Next.js')) {
    recommendations.push('Jest with @testing-library/react for Next.js');
  }

  // Check for Vue
  if (repoMetadata.frameworks && repoMetadata.frameworks.includes('Vue')) {
    recommendations.push('Vitest with @vue/test-utils for Vue components');
  }

  // Check for Python
  if (repoMetadata.languages && repoMetadata.languages.includes('Python')) {
    recommendations.push('pytest for Python testing (with pytest-cov for coverage)');
  }

  // Check for TypeScript
  if (repoMetadata.languages && repoMetadata.languages.includes('TypeScript')) {
    if (recommendations.length === 0) {
      recommendations.push('Jest or Vitest for TypeScript projects');
    }
  }

  // Check for JavaScript (generic)
  if (repoMetadata.languages && repoMetadata.languages.includes('JavaScript')) {
    if (recommendations.length === 0) {
      recommendations.push('Jest for JavaScript testing');
    }
  }

  // Add E2E testing recommendation
  if (repoMetadata.frameworks && (
    repoMetadata.frameworks.includes('React') ||
    repoMetadata.frameworks.includes('Vue') ||
    repoMetadata.frameworks.includes('Next.js')
  )) {
    recommendations.push('Playwright or Cypress for end-to-end testing');
  }

  return recommendations;
};

/**
 * Check test coverage
 */
export async function checkTestCoverage(repoPath, repoMetadata) {
  const findings = [];
  const warnings = [];

  // Check for test directories
  const testDirs = checkTestDirectories(repoPath);
  const hasTestDir = testDirs.length > 0;

  if (!hasTestDir) {
    findings.push({
      severity: 'MEDIUM',
      tool: 'test-coverage-agent',
      file: 'N/A',
      issue: 'No test directory found',
      recommendation: 'Create a test directory (tests/, test/, or __tests__/) and add unit tests',
    });
  } else {
    warnings.push(`Found test directories: ${testDirs.join(', ')}`);
  }

  // Check for test configuration
  const testConfigs = checkTestConfig(repoPath);
  const hasTestConfig = testConfigs.length > 0;

  if (hasTestConfig) {
    warnings.push(`Found test config: ${testConfigs.join(', ')}`);
  } else {
    findings.push({
      severity: 'LOW',
      tool: 'test-coverage-agent',
      file: 'N/A',
      issue: 'No test configuration found',
      recommendation: 'Add a test configuration file (jest.config.js, vitest.config.ts, or pytest.ini)',
    });
  }

  // Check for coverage configuration
  const coverageConfig = checkCoverageConfig(repoPath);
  const hasCoverageConfig = coverageConfig.configured;

  if (hasCoverageConfig) {
    warnings.push(`Coverage configured: ${coverageConfig.details.join(', ')}`);
  } else {
    findings.push({
      severity: 'LOW',
      tool: 'test-coverage-agent',
      file: 'N/A',
      issue: 'No coverage threshold configured',
      recommendation: 'Add coverage thresholds to ensure code quality (e.g., jest coverageThreshold or pytest --cov-fail-under)',
    });
  }

  // Count test files
  const testFiles = countTestFiles(repoPath);
  const testFilesCount = testFiles.length;

  if (testFilesCount > 0) {
    warnings.push(`Found ${testFilesCount} test files`);
  }

  // Count source files
  const sourceFilesCount = countSourceFiles(repoPath);

  // Check if there are no test files but many source files
  if (testFilesCount === 0 && sourceFilesCount > 10) {
    findings.push({
      severity: 'HIGH',
      tool: 'test-coverage-agent',
      file: 'N/A',
      issue: `No test files found, but ${sourceFilesCount} source files exist`,
      recommendation: 'Add unit tests to improve code quality and catch bugs early. Aim for at least 70% code coverage.',
    });
  } else if (testFilesCount === 0 && sourceFilesCount > 0) {
    findings.push({
      severity: 'MEDIUM',
      tool: 'test-coverage-agent',
      file: 'N/A',
      issue: 'No test files found',
      recommendation: 'Add unit tests to verify code functionality and prevent regressions',
    });
  }

  // Calculate test-to-source ratio
  let testRatio = 0;
  if (sourceFilesCount > 0 && testFilesCount > 0) {
    testRatio = (testFilesCount / sourceFilesCount) * 100;
    warnings.push(`Test-to-source ratio: ${testRatio.toFixed(1)}%`);

    if (testRatio < 30) {
      findings.push({
        severity: 'MEDIUM',
        tool: 'test-coverage-agent',
        file: 'N/A',
        issue: `Low test coverage ratio: ${testRatio.toFixed(1)}% (${testFilesCount} test files for ${sourceFilesCount} source files)`,
        recommendation: 'Increase test coverage by adding more test files. Aim for at least 1 test file per 2-3 source files.',
      });
    }
  }

  // Try to run tests with coverage
  let actualCoverage = null;
  if (hasTestConfig && testFilesCount > 0) {
    warnings.push('Attempting to run tests with coverage...');
    const testResult = await runTestsWithCoverage(repoPath);
    
    if (testResult.ran) {
      warnings.push('Test run completed');
      
      if (testResult.coveragePercent !== null) {
        actualCoverage = testResult.coveragePercent;
        warnings.push(`Actual code coverage: ${actualCoverage.toFixed(1)}%`);
        
        // Add findings based on actual coverage
        if (actualCoverage < 50) {
          findings.push({
            severity: 'HIGH',
            tool: 'test-coverage-agent',
            file: 'N/A',
            issue: `Low code coverage: ${actualCoverage.toFixed(1)}%`,
            recommendation: 'Increase test coverage to at least 70%. Focus on critical business logic and edge cases.',
          });
        } else if (actualCoverage < 70) {
          findings.push({
            severity: 'MEDIUM',
            tool: 'test-coverage-agent',
            file: 'N/A',
            issue: `Moderate code coverage: ${actualCoverage.toFixed(1)}%`,
            recommendation: 'Aim for 70-80% code coverage for production applications.',
          });
        }
      } else {
        warnings.push('Could not parse coverage percentage from test output');
      }
    } else {
      warnings.push('Test run skipped or failed');
    }
  }

  // Get testing tool recommendations
  const toolRecommendations = recommendTestingTools(repoMetadata);

  return {
    findings,
    testFilesCount,
    sourceFilesCount,
    testRatio: Math.round(testRatio),
    actualCoverage: actualCoverage !== null ? Math.round(actualCoverage) : null,
    hasTestDir,
    hasTestConfig,
    hasCoverageConfig,
    testDirs,
    testConfigs,
    coverageDetails: coverageConfig.details,
    toolRecommendations,
    warnings,
  };
}

// Made with Bob
