import { jest } from '@jest/globals';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  rmSync: jest.fn(),
};

// Mock spawnWithTimeout
const mockSpawnWithTimeout = jest.fn();

const normalizePath = (value) => String(value).replace(/\\/g, '/');
const fsMock = {
  existsSync: (filePath) => mockFs.existsSync(normalizePath(filePath)),
  readFileSync: (filePath, ...args) => mockFs.readFileSync(normalizePath(filePath), ...args),
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
  rmSync: (...args) => mockFs.rmSync(...args),
};
fsMock.default = fsMock;

jest.unstable_mockModule('fs', () => fsMock);
jest.unstable_mockModule('../middleware/timeoutManager.js', () => ({
  spawnWithTimeout: mockSpawnWithTimeout,
}));

const { analyzeComplexity } = await import('./complexityAgent.js');

describe('complexityAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeComplexity', () => {
    test('should flag file > 300 lines', async () => {
      const repoPath = '/test/large-file-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      // Mock directory structure
      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['large-file.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      // Mock file with 350 lines
      const largeFileContent = Array.from({ length: 350 }, (_, i) => 
        `// Line ${i + 1}\nconst var${i} = ${i};`
      ).join('\n');

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('large-file.js')) {
          return largeFileContent;
        }
        return '';
      });

      // Mock plato not available
      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await analyzeComplexity(repoPath, repoMetadata);

      expect(result.complexFiles).toBeDefined();
      expect(result.complexFiles.length).toBeGreaterThan(0);
      
      const largeFile = result.complexFiles.find(f => f.file.includes('large-file.js'));
      expect(largeFile).toBeDefined();
      expect(largeFile.lines).toBeGreaterThan(300);
      expect(largeFile.flag).toContain('Large file');
      expect(largeFile.flag).toContain('consider splitting');
    });

    test('should flag file with 20 if statements', async () => {
      const repoPath = '/test/complex-file-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['complex-file.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      // Mock file with 20 if statements
      const complexFileContent = `
function processData(data) {
  if (data.type === 'A') { return 'A'; }
  if (data.type === 'B') { return 'B'; }
  if (data.type === 'C') { return 'C'; }
  if (data.type === 'D') { return 'D'; }
  if (data.type === 'E') { return 'E'; }
  if (data.type === 'F') { return 'F'; }
  if (data.type === 'G') { return 'G'; }
  if (data.type === 'H') { return 'H'; }
  if (data.type === 'I') { return 'I'; }
  if (data.type === 'J') { return 'J'; }
  if (data.type === 'K') { return 'K'; }
  if (data.type === 'L') { return 'L'; }
  if (data.type === 'M') { return 'M'; }
  if (data.type === 'N') { return 'N'; }
  if (data.type === 'O') { return 'O'; }
  if (data.type === 'P') { return 'P'; }
  if (data.type === 'Q') { return 'Q'; }
  if (data.type === 'R') { return 'R'; }
  if (data.type === 'S') { return 'S'; }
  if (data.type === 'T') { return 'T'; }
  return 'default';
}
`;

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('complex-file.js')) {
          return complexFileContent;
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await analyzeComplexity(repoPath, repoMetadata);

      expect(result.complexFiles).toBeDefined();
      expect(result.complexFiles.length).toBeGreaterThan(0);
      
      const complexFile = result.complexFiles.find(f => f.file.includes('complex-file.js'));
      expect(complexFile).toBeDefined();
      expect(complexFile.conditionals).toBeGreaterThan(15);
      expect(complexFile.flag).toContain('High cyclomatic complexity');
    });

    test('should not flag small files', async () => {
      const repoPath = '/test/small-files-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['small-file1.js', 'small-file2.js', 'small-file3.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      // Mock small files (< 300 lines, < 15 conditionals)
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('small-file')) {
          return `
// Small file with minimal complexity
function add(a, b) {
  if (a < 0) return 0;
  if (b < 0) return 0;
  return a + b;
}

function multiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return a * b;
}

export { add, multiply };
`;
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await analyzeComplexity(repoPath, repoMetadata);

      // Small files should not be flagged
      expect(result.complexFiles.length).toBe(0);
      expect(result.averageFileSize).toBeLessThan(300);
    });

    test('should calculate average file size', async () => {
      const repoPath = '/test/avg-size-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['file1.js', 'file2.js', 'file3.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('file1.js')) {
          return Array.from({ length: 100 }, () => 'line').join('\n');
        }
        if (path.includes('file2.js')) {
          return Array.from({ length: 200 }, () => 'line').join('\n');
        }
        if (path.includes('file3.js')) {
          return Array.from({ length: 300 }, () => 'line').join('\n');
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await analyzeComplexity(repoPath, repoMetadata);

      // Average should be (100 + 200 + 300) / 3 = 200
      expect(result.averageFileSize).toBe(200);
      expect(result.totalFilesAnalyzed).toBe(3);
    });

    test('should identify largest file', async () => {
      const repoPath = '/test/largest-file-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['small.js', 'medium.js', 'large.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('small.js')) {
          return Array.from({ length: 100 }, () => 'line').join('\n');
        }
        if (path.includes('medium.js')) {
          return Array.from({ length: 250 }, () => 'line').join('\n');
        }
        if (path.includes('large.js')) {
          return Array.from({ length: 450 }, () => 'line').join('\n');
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await analyzeComplexity(repoPath, repoMetadata);

      expect(result.largestFile).toBeDefined();
      expect(result.largestFile.file).toContain('large.js');
      expect(result.largestFile.lines).toBe(450);
    });

    test('should sort by conditionals descending', async () => {
      const repoPath = '/test/sorted-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['file1.js', 'file2.js', 'file3.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('file1.js')) {
          // 350 lines, 10 conditionals
          return Array.from({ length: 350 }, (_, i) => 
            i % 35 === 0 ? 'if (x) {}' : 'line'
          ).join('\n');
        }
        if (path.includes('file2.js')) {
          // 200 lines, 25 conditionals
          return Array.from({ length: 200 }, (_, i) => 
            i % 8 === 0 ? 'if (x) {}' : 'line'
          ).join('\n');
        }
        if (path.includes('file3.js')) {
          // 400 lines, 18 conditionals
          return Array.from({ length: 400 }, (_, i) => 
            i % 22 === 0 ? 'if (x) {}' : 'line'
          ).join('\n');
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await analyzeComplexity(repoPath, repoMetadata);

      expect(result.complexFiles.length).toBeGreaterThan(0);
      
      // Should be sorted by conditionals descending
      // file2 (25) > file3 (18) > file1 (10)
      if (result.complexFiles.length >= 2) {
        expect(result.complexFiles[0].conditionals).toBeGreaterThanOrEqual(
          result.complexFiles[1].conditionals
        );
      }
    });

    test('should generate recommendations for large files', async () => {
      const repoPath = '/test/recommendations-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['huge-file.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('huge-file.js')) {
          return Array.from({ length: 500 }, () => 'line').join('\n');
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await analyzeComplexity(repoPath, repoMetadata);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      const recommendation = result.recommendations[0];
      expect(recommendation).toContain('Consider breaking');
      expect(recommendation).toContain('huge-file.js');
      expect(recommendation).toContain('500 lines');
      expect(recommendation).toContain('smaller modules');
    });

    test('should cap findings at 50', async () => {
      const repoPath = '/test/many-complex-files-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return Array.from({ length: 100 }, (_, i) => `file${i}.js`);
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      // All files are large
      mockFs.readFileSync.mockReturnValue(
        Array.from({ length: 350 }, () => 'line').join('\n')
      );

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await analyzeComplexity(repoPath, repoMetadata);

      expect(result.complexFiles.length).toBeLessThanOrEqual(50);
    });
  });
});

// Made with Bob
