import { jest } from '@jest/globals';
import { checkTestCoverage } from './testCoverageAgent.js';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
};

// Mock spawnWithTimeout
const mockSpawnWithTimeout = jest.fn();

jest.unstable_mockModule('fs', () => mockFs);
jest.unstable_mockModule('../middleware/timeoutManager.js', () => ({
  spawnWithTimeout: mockSpawnWithTimeout,
}));

describe('testCoverageAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkTestCoverage', () => {
    test('should return MEDIUM finding when no test directory exists', async () => {
      const repoPath = '/test/no-tests-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: ['Express'],
      };

      // Mock directory structure - no test directories
      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src', 'package.json', 'README.md'];
        }
        if (path.includes('src')) {
          return ['index.js', 'utils.js', 'routes.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockImplementation((path) => {
        // No test directories exist
        if (path.includes('test') || path.includes('__tests__') || path.includes('spec')) {
          return false;
        }
        return true;
      });

      mockFs.readFileSync.mockReturnValue('{}');

      // Mock npm test not available
      mockSpawnWithTimeout.mockRejectedValue(new Error('No test script'));

      const result = await checkTestCoverage(repoPath, repoMetadata);

      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      
      const noTestDirFinding = result.findings.find(f => 
        f.issue.includes('No test directory found')
      );
      
      expect(noTestDirFinding).toBeDefined();
      expect(noTestDirFinding.severity).toBe('MEDIUM');
      expect(noTestDirFinding.tool).toBe('testCoverageAgent');
      expect(noTestDirFinding.recommendation).toContain('Create a test directory');
    });

    test('should return HIGH finding when 0 test files with 15 src files', async () => {
      const repoPath = '/test/no-test-files-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: ['Express'],
      };

      // Mock directory structure - test dir exists but no test files
      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src', 'test', 'package.json'];
        }
        if (path.includes('src')) {
          // 15 source files
          return Array.from({ length: 15 }, (_, i) => `file${i}.js`);
        }
        if (path.includes('test')) {
          // Empty test directory
          return [];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src') || path.includes('test'),
        isFile: () => !path.includes('src') && !path.includes('test'),
      }));

      mockFs.existsSync.mockImplementation((path) => {
        if (path.includes('test')) {
          return true; // test dir exists
        }
        return true;
      });

      mockFs.readFileSync.mockReturnValue('{}');

      mockSpawnWithTimeout.mockRejectedValue(new Error('No test script'));

      const result = await checkTestCoverage(repoPath, repoMetadata);

      expect(result.findings).toBeDefined();
      expect(result.testFilesCount).toBe(0);
      expect(result.sourceFilesCount).toBe(15);
      
      const noTestFilesFinding = result.findings.find(f => 
        f.issue.includes('0 test files found') && f.issue.includes('15 source files')
      );
      
      expect(noTestFilesFinding).toBeDefined();
      expect(noTestFilesFinding.severity).toBe('HIGH');
      expect(noTestFilesFinding.tool).toBe('testCoverageAgent');
      expect(noTestFilesFinding.recommendation).toContain('Write tests');
      expect(noTestFilesFinding.recommendation).toContain('critical for production');
    });

    test('should detect test files in test directory', async () => {
      const repoPath = '/test/with-tests-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: ['Express'],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src', 'test', 'package.json'];
        }
        if (path.includes('src')) {
          return ['index.js', 'utils.js'];
        }
        if (path.includes('test')) {
          return ['index.test.js', 'utils.test.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src') || path.includes('test'),
        isFile: () => !path.includes('src') && !path.includes('test'),
      }));

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{}');

      mockSpawnWithTimeout.mockRejectedValue(new Error('No test script'));

      const result = await checkTestCoverage(repoPath, repoMetadata);

      expect(result.hasTestDir).toBe(true);
      expect(result.testFilesCount).toBe(2);
      expect(result.sourceFilesCount).toBe(2);
    });

    test('should detect test files in __tests__ directory', async () => {
      const repoPath = '/test/jest-tests-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: ['React'],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src', '__tests__', 'package.json'];
        }
        if (path.includes('src')) {
          return ['App.js', 'utils.js'];
        }
        if (path.includes('__tests__')) {
          return ['App.test.js', 'utils.test.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src') || path.includes('__tests__'),
        isFile: () => !path.includes('src') && !path.includes('__tests__'),
      }));

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{}');

      mockSpawnWithTimeout.mockRejectedValue(new Error('No test script'));

      const result = await checkTestCoverage(repoPath, repoMetadata);

      expect(result.hasTestDir).toBe(true);
      expect(result.testFilesCount).toBe(2);
    });

    test('should detect coverage config in package.json', async () => {
      const repoPath = '/test/coverage-config-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src', 'test', 'package.json'];
        }
        if (path.includes('src')) {
          return ['index.js'];
        }
        if (path.includes('test')) {
          return ['index.test.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src') || path.includes('test'),
        isFile: () => !path.includes('src') && !path.includes('test'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            scripts: {
              test: 'jest --coverage'
            },
            jest: {
              collectCoverage: true,
              coverageThreshold: {
                global: {
                  branches: 80,
                  functions: 80,
                  lines: 80,
                  statements: 80
                }
              }
            }
          });
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('No test script'));

      const result = await checkTestCoverage(repoPath, repoMetadata);

      expect(result.hasCoverageConfig).toBe(true);
    });

    test('should parse coverage percentage from npm test output', async () => {
      const repoPath = '/test/coverage-output-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src', 'test', 'package.json'];
        }
        if (path.includes('src')) {
          return ['index.js'];
        }
        if (path.includes('test')) {
          return ['index.test.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src') || path.includes('test'),
        isFile: () => !path.includes('src') && !path.includes('test'),
      }));

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        scripts: { test: 'jest --coverage' }
      }));

      // Mock successful test run with coverage output
      mockSpawnWithTimeout.mockResolvedValue({
        stdout: `
PASS  test/index.test.js
  ✓ should work (5ms)

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |   85.71 |    66.67 |     100 |   85.71 |                   
 index.js |   85.71 |    66.67 |     100 |   85.71 | 12-15             
----------|---------|----------|---------|---------|-------------------
`,
        stderr: '',
        code: 0
      });

      const result = await checkTestCoverage(repoPath, repoMetadata);

      expect(result.coveragePercentage).toBe(85.71);
      expect(result.findings.length).toBe(0); // Good coverage, no findings
    });

    test('should flag LOW coverage percentage', async () => {
      const repoPath = '/test/low-coverage-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src', 'test', 'package.json'];
        }
        if (path.includes('src')) {
          return ['index.js'];
        }
        if (path.includes('test')) {
          return ['index.test.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src') || path.includes('test'),
        isFile: () => !path.includes('src') && !path.includes('test'),
      }));

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        scripts: { test: 'jest --coverage' }
      }));

      mockSpawnWithTimeout.mockResolvedValue({
        stdout: `
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |   35.50 |    20.00 |   40.00 |   35.50 |                   
----------|---------|----------|---------|---------|-------------------
`,
        stderr: '',
        code: 0
      });

      const result = await checkTestCoverage(repoPath, repoMetadata);

      expect(result.coveragePercentage).toBe(35.50);
      
      const lowCoverageFinding = result.findings.find(f => 
        f.issue.includes('Low test coverage')
      );
      
      expect(lowCoverageFinding).toBeDefined();
      expect(lowCoverageFinding.severity).toBe('MEDIUM');
      expect(lowCoverageFinding.recommendation).toContain('Increase test coverage');
    });

    test('should recommend Jest for React projects', async () => {
      const repoPath = '/test/react-no-tests-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: ['React'],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src', 'package.json'];
        }
        if (path.includes('src')) {
          return ['App.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockImplementation((path) => {
        if (path.includes('test') || path.includes('__tests__')) {
          return false;
        }
        return true;
      });

      mockFs.readFileSync.mockReturnValue('{}');
      mockSpawnWithTimeout.mockRejectedValue(new Error('No test script'));

      const result = await checkTestCoverage(repoPath, repoMetadata);

      expect(result.recommendedTools).toBeDefined();
      expect(result.recommendedTools).toContain('Jest');
      expect(result.recommendedTools).toContain('React Testing Library');
    });

    test('should recommend pytest for Python projects', async () => {
      const repoPath = '/test/python-no-tests-repo';
      const repoMetadata = {
        languages: ['Python'],
        frameworks: ['Flask'],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src', 'requirements.txt'];
        }
        if (path.includes('src')) {
          return ['app.py'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockImplementation((path) => {
        if (path.includes('test') || path.includes('tests')) {
          return false;
        }
        return true;
      });

      mockFs.readFileSync.mockReturnValue('');
      mockSpawnWithTimeout.mockRejectedValue(new Error('No test script'));

      const result = await checkTestCoverage(repoPath, repoMetadata);

      expect(result.recommendedTools).toBeDefined();
      expect(result.recommendedTools).toContain('pytest');
      expect(result.recommendedTools).toContain('pytest-cov');
    });
  });
});

// Made with Bob