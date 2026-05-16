import { jest } from '@jest/globals';
import { analyzeRepo } from './repoAnalyzerAgent.js';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
};

// Mock the fs module
jest.unstable_mockModule('fs', () => mockFs);

describe('repoAnalyzerAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeRepo', () => {
    test('should detect Node.js repository', async () => {
      const repoPath = '/test/node-repo';

      // Mock package.json exists
      mockFs.existsSync.mockImplementation((path) => {
        if (path.includes('package.json')) return true;
        if (path.includes('src')) return true;
        return false;
      });

      // Mock package.json content
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            name: 'test-app',
            version: '1.0.0',
            dependencies: {
              express: '^4.18.0',
              react: '^18.2.0',
            },
            devDependencies: {
              jest: '^29.0.0',
            },
            scripts: {
              test: 'jest',
              start: 'node index.js',
            },
          });
        }
        return '';
      });

      // Mock directory structure
      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['package.json', 'src', 'node_modules', '.git'];
        }
        if (path.includes('src')) {
          return ['index.js', 'app.js', 'utils.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src') || path.includes('node_modules') || path.includes('.git'),
        isFile: () => !path.includes('src') && !path.includes('node_modules') && !path.includes('.git'),
      }));

      const result = await analyzeRepo(repoPath);

      expect(result.languages).toContain('JavaScript');
      expect(result.frameworks).toContain('Express');
      expect(result.frameworks).toContain('React');
      expect(result.hasDocker).toBe(false);
      expect(result.hasTests).toBe(true);
      expect(result.testFrameworks).toContain('jest');
      expect(result.fileCount).toBeGreaterThan(0);
      expect(result.packageJson).toBeDefined();
      expect(result.packageJson.name).toBe('test-app');
    });

    test('should detect Python repository', async () => {
      const repoPath = '/test/python-repo';

      // Mock requirements.txt exists
      mockFs.existsSync.mockImplementation((path) => {
        if (path.includes('requirements.txt')) return true;
        if (path.includes('src')) return true;
        return false;
      });

      // Mock requirements.txt content
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('requirements.txt')) {
          return 'flask==2.3.0\ndjango==4.2.0\npytest==7.4.0\nrequests>=2.28.0';
        }
        return '';
      });

      // Mock directory structure
      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['requirements.txt', 'src', 'tests', '.git'];
        }
        if (path.includes('src')) {
          return ['main.py', 'app.py', 'utils.py'];
        }
        if (path.includes('tests')) {
          return ['test_main.py'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src') || path.includes('tests') || path.includes('.git'),
        isFile: () => !path.includes('src') && !path.includes('tests') && !path.includes('.git'),
      }));

      const result = await analyzeRepo(repoPath);

      expect(result.languages).toContain('Python');
      expect(result.frameworks).toContain('Flask');
      expect(result.frameworks).toContain('Django');
      expect(result.hasDocker).toBe(false);
      expect(result.hasTests).toBe(true);
      expect(result.testFrameworks).toContain('pytest');
      expect(result.pythonPackages).toBeDefined();
      expect(result.pythonPackages.length).toBeGreaterThan(0);
    });

    test('should detect Docker in repository', async () => {
      const repoPath = '/test/docker-repo';

      // Mock Dockerfile exists
      mockFs.existsSync.mockImplementation((path) => {
        if (path.includes('Dockerfile')) return true;
        if (path.includes('docker-compose.yml')) return true;
        if (path.includes('package.json')) return true;
        return false;
      });

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            name: 'docker-app',
            version: '1.0.0',
          });
        }
        return '';
      });

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['Dockerfile', 'docker-compose.yml', 'package.json', 'src'];
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

      const result = await analyzeRepo(repoPath);

      expect(result.hasDocker).toBe(true);
      expect(result.languages).toContain('JavaScript');
    });

    test('should return unknown for empty folder', async () => {
      const repoPath = '/test/empty-repo';

      // Mock empty directory
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([]);
      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => false,
        isFile: () => false,
      }));

      const result = await analyzeRepo(repoPath);

      expect(result.languages).toEqual([]);
      expect(result.frameworks).toEqual([]);
      expect(result.hasDocker).toBe(false);
      expect(result.hasTests).toBe(false);
      expect(result.fileCount).toBe(0);
      expect(result.totalLines).toBe(0);
    });

    test('should detect multiple languages', async () => {
      const repoPath = '/test/multi-lang-repo';

      // Mock both package.json and requirements.txt
      mockFs.existsSync.mockImplementation((path) => {
        if (path.includes('package.json')) return true;
        if (path.includes('requirements.txt')) return true;
        if (path.includes('src')) return true;
        return false;
      });

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            name: 'multi-lang-app',
            dependencies: { express: '^4.0.0' },
          });
        }
        if (path.includes('requirements.txt')) {
          return 'flask==2.3.0';
        }
        return '';
      });

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['package.json', 'requirements.txt', 'src'];
        }
        if (path.includes('src')) {
          return ['index.js', 'app.py', 'utils.ts'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      const result = await analyzeRepo(repoPath);

      expect(result.languages).toContain('JavaScript');
      expect(result.languages).toContain('TypeScript');
      expect(result.languages).toContain('Python');
      expect(result.frameworks).toContain('Express');
      expect(result.frameworks).toContain('Flask');
    });

    test('should detect CI/CD tools', async () => {
      const repoPath = '/test/ci-repo';

      mockFs.existsSync.mockImplementation((path) => {
        if (path.includes('.github/workflows')) return true;
        if (path.includes('.gitlab-ci.yml')) return true;
        if (path.includes('package.json')) return true;
        return false;
      });

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ name: 'ci-app' });
        }
        return '';
      });

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['.github', '.gitlab-ci.yml', 'package.json'];
        }
        if (path.includes('.github')) {
          return ['workflows'];
        }
        if (path.includes('workflows')) {
          return ['ci.yml'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('.github') || path.includes('workflows'),
        isFile: () => !path.includes('.github') && !path.includes('workflows'),
      }));

      const result = await analyzeRepo(repoPath);

      expect(result.ciTools).toContain('GitHub Actions');
      expect(result.ciTools).toContain('GitLab CI');
    });
  });
});

// Made with Bob