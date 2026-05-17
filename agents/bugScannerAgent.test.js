import { jest } from '@jest/globals';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
};

// Mock spawnWithTimeout from timeoutManager
const mockSpawnWithTimeout = jest.fn();

// Mock the modules
const normalizePath = (value) => String(value).replace(/\\/g, '/');
const fsMock = {
  existsSync: (filePath) => mockFs.existsSync(normalizePath(filePath)),
  readFileSync: (filePath, ...args) => mockFs.readFileSync(normalizePath(filePath), ...args),
  writeFileSync: (...args) => mockFs.writeFileSync(...args),
  readdirSync: (dirPath, ...args) => mockFs.readdirSync(normalizePath(dirPath), ...args),
  statSync: (filePath, ...args) => {
    const normalized = normalizePath(filePath);
    const stats = mockFs.statSync(normalized, ...args);
    const baseName = normalized.split('/').pop();
    const isFileByName = baseName.includes('.');
    return {
      ...stats,
      isDirectory: () => !isFileByName && stats.isDirectory(),
      isFile: () => isFileByName || stats.isFile(),
    };
  },
};
fsMock.default = fsMock;

jest.unstable_mockModule('fs', () => fsMock);
jest.unstable_mockModule('fs/promises', () => ({
  readFile: jest.fn((filePath) => Promise.resolve(mockFs.readFileSync(normalizePath(filePath)))),
  readdir: jest.fn((dirPath, options) => {
    const normalizedDir = normalizePath(dirPath);
    const entries = mockFs.readdirSync(normalizedDir);
    if (!options?.withFileTypes) return Promise.resolve(entries);
    return Promise.resolve(entries.map((name) => {
      const fullPath = `${normalizedDir}/${name}`;
      const stats = fsMock.statSync(fullPath);
      const directoryNames = new Set(['src', 'test', 'tests', '__tests__', 'lib', 'app']);
      return {
        name,
        isDirectory: () => directoryNames.has(name),
        isFile: () => !directoryNames.has(name),
      };
    }));
  }),
}));
jest.unstable_mockModule('../middleware/timeoutManager.js', () => ({
  spawnWithTimeout: mockSpawnWithTimeout,
}));

const { scanBugs } = await import('./bugScannerAgent.js');

describe('bugScannerAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSpawnWithTimeout.mockReset();
  });

  describe('scanBugs', () => {
    test('should detect TODO comments', async () => {
      const repoPath = '/test/todo-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: ['React'],
      };

      // Mock directory structure
      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['app.js', 'utils.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      // Mock file content with TODO comments
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('app.js')) {
          return `
function processData(data) {
  // TODO: Add validation here
  return data.map(item => item.value);
}

// FIXME: This needs optimization
function slowFunction() {
  // TODO: Implement caching
  return heavyComputation();
}
`;
        }
        if (path.includes('utils.js')) {
          return `
// FIXME: Handle edge cases
export function helper() {
  return true;
}
`;
        }
        return '';
      });

      // Mock eslint not available
      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanBugs(repoPath, repoMetadata);

      expect(result.findings).toBeDefined();
      
      // Check for TODO findings
      const todoFindings = result.findings.filter(f => 
        f.issue.includes('TODO') || f.issue.includes('FIXME')
      );
      expect(todoFindings.length).toBeGreaterThan(0);
      
      // Verify file paths and line numbers
      const appJsTodo = todoFindings.find(f => f.file.includes('app.js'));
      expect(appJsTodo).toBeDefined();
      expect(appJsTodo.line).toBeGreaterThan(0);
    });

    test('should detect empty catch blocks', async () => {
      const repoPath = '/test/empty-catch-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['error-handler.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      // Mock file with empty catch block
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('error-handler.js')) {
          return `
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    return response.json();
  } catch (error) {
    // Empty catch - bad practice
  }
}

function processItem(item) {
  try {
    return item.process();
  } catch (e) {
    console.error('Error:', e);
  }
}
`;
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanBugs(repoPath, repoMetadata);

      // Check for empty catch detection
      const emptyCatchFindings = result.findings.filter(f => 
        f.issue.includes('catch') && f.issue.includes('empty')
      );
      expect(emptyCatchFindings.length).toBeGreaterThan(0);
      
      const finding = emptyCatchFindings[0];
      expect(finding.severity).toBe('MEDIUM');
      expect(finding.file).toContain('error-handler.js');
    });

    test('should detect console.error-only handlers', async () => {
      const repoPath = '/test/console-error-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['handler.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      // Mock file with console.error-only handler
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('handler.js')) {
          return `
async function loadData() {
  try {
    return await fetchData();
  } catch (error) {
    console.error(error);
  }
}

function saveData(data) {
  try {
    database.save(data);
  } catch (err) {
    console.error('Save failed:', err);
  }
}
`;
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanBugs(repoPath, repoMetadata);

      // Check for console.error-only handler detection
      const consoleErrorFindings = result.findings.filter(f => 
        f.issue.includes('console.error') && f.issue.includes('only')
      );
      expect(consoleErrorFindings.length).toBeGreaterThan(0);
      
      const finding = consoleErrorFindings[0];
      expect(finding.severity).toBe('LOW');
      expect(finding.recommendation).toContain('proper error handling');
    });

    test('should flag missing tests folder', async () => {
      const repoPath = '/test/no-tests-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: ['Express'],
      };

      // Mock no test directories
      mockFs.existsSync.mockImplementation((path) => {
        if (path.includes('test') || path.includes('__tests__') || path.includes('spec')) {
          return false;
        }
        return true;
      });

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src', 'package.json'];
        }
        if (path.includes('src')) {
          return ['app.js', 'utils.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.readFileSync.mockReturnValue('// Clean code');

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanBugs(repoPath, repoMetadata);

      // Check for missing tests warning
      const missingTestsFindings = result.findings.filter(f => 
        f.issue.includes('test') && (f.issue.includes('missing') || f.issue.includes('No test'))
      );
      expect(missingTestsFindings.length).toBeGreaterThan(0);
      
      const finding = missingTestsFindings[0];
      expect(finding.severity).toBe('MEDIUM');
      expect(finding.recommendation).toContain('test');
    });

    test('should add warning when eslint not found', async () => {
      const repoPath = '/test/no-eslint-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['index.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('console.log("test");');

      // Mock eslint command not found
      mockSpawnWithTimeout.mockRejectedValueOnce(new Error('Command not found: eslint'));

      const result = await scanBugs(repoPath, repoMetadata);

      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(w => 
        w.includes('eslint') || w.includes('not available') || w.includes('not found')
      )).toBe(true);
    });

    test('should parse eslint JSON output', async () => {
      const repoPath = '/test/eslint-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: ['React'],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['src']);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true });
      mockFs.readFileSync.mockReturnValue('');

      // Mock eslint output
      const eslintOutput = JSON.stringify([
        {
          filePath: '/test/eslint-repo/src/app.js',
          messages: [
            {
              ruleId: 'no-unused-vars',
              severity: 2,
              message: "'unused' is defined but never used",
              line: 5,
              column: 7,
            },
            {
              ruleId: 'no-console',
              severity: 1,
              message: 'Unexpected console statement',
              line: 10,
              column: 3,
            },
          ],
        },
      ]);

      mockSpawnWithTimeout.mockResolvedValueOnce({
        stdout: eslintOutput,
        stderr: '',
        code: 1,
      });

      const result = await scanBugs(repoPath, repoMetadata);

      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      
      // Check for eslint findings
      const eslintFindings = result.findings.filter(f => f.tool === 'eslint');
      expect(eslintFindings.length).toBeGreaterThan(0);
      
      const unusedVarFinding = eslintFindings.find(f => f.issue.includes('unused'));
      expect(unusedVarFinding).toBeDefined();
      expect(unusedVarFinding.severity).toBe('MEDIUM');
      expect(unusedVarFinding.line).toBe(5);
    });

    test('should cap findings at 100', async () => {
      const repoPath = '/test/many-bugs-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          // Return many files
          return Array.from({ length: 50 }, (_, i) => `file${i}.js`);
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      // Mock files with many TODOs
      mockFs.readFileSync.mockReturnValue(`
// TODO: Fix this
// TODO: Refactor
// TODO: Add tests
// FIXME: Bug here
// TODO: Optimize
      `);

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanBugs(repoPath, repoMetadata);

      expect(result.findings.length).toBeLessThanOrEqual(100);
      expect(result.warnings.some(w => w.includes('100') || w.includes('showing'))).toBe(true);
    });

    test('should handle Python files with ruff', async () => {
      const repoPath = '/test/python-repo';
      const repoMetadata = {
        languages: ['Python'],
        frameworks: ['Flask'],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['src']);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true });
      mockFs.readFileSync.mockReturnValue('');

      // Mock ruff output
      const ruffOutput = JSON.stringify([
        {
          filename: 'src/app.py',
          violations: [
            {
              code: 'F401',
              message: 'Module imported but unused',
              line: 3,
              column: 1,
            },
          ],
        },
      ]);

      mockSpawnWithTimeout.mockResolvedValueOnce({
        stdout: ruffOutput,
        stderr: '',
        code: 1,
      });

      const result = await scanBugs(repoPath, repoMetadata);

      expect(result.findings).toBeDefined();
      const ruffFindings = result.findings.filter(f => f.tool === 'ruff');
      expect(ruffFindings.length).toBeGreaterThan(0);
    });
  });
});

// Made with Bob
