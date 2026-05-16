import { jest } from '@jest/globals';
import { generateReadme } from './readmeGeneratorAgent.js';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
};

// Mock the fs module
jest.unstable_mockModule('fs', () => mockFs);

describe('readmeGeneratorAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReadme', () => {
    test('should generate README with Installation section', async () => {
      const repoPath = '/test/repo';
      const repoMetadata = {
        name: 'test-app',
        languages: ['JavaScript'],
        frameworks: ['Express'],
        hasDocker: false,
        hasTests: true,
        packageJson: {
          name: 'test-app',
          version: '1.0.0',
          description: 'A test application',
          scripts: {
            start: 'node index.js',
            test: 'jest',
          },
          dependencies: {
            express: '^4.18.0',
          },
        },
      };

      // Mock no existing README
      mockFs.existsSync.mockReturnValue(false);

      const result = await generateReadme(repoPath, repoMetadata);

      expect(result.title).toBe('test-app');
      expect(result.content).toContain('## Installation');
      expect(result.content).toContain('npm install');
      expect(result.content).toContain('## Usage');
      expect(result.content).toContain('npm start');
    });

    test('should include detected framework name in README', async () => {
      const repoPath = '/test/react-app';
      const repoMetadata = {
        name: 'react-app',
        languages: ['JavaScript', 'TypeScript'],
        frameworks: ['React', 'Vite'],
        hasDocker: false,
        hasTests: true,
        packageJson: {
          name: 'react-app',
          version: '1.0.0',
          description: 'A React application',
          scripts: {
            dev: 'vite',
            build: 'vite build',
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
        },
      };

      mockFs.existsSync.mockReturnValue(false);

      const result = await generateReadme(repoPath, repoMetadata);

      expect(result.content).toContain('React');
      expect(result.content).toContain('Vite');
      expect(result.content).toContain('## Tech Stack');
      expect(result.content).toContain('JavaScript');
      expect(result.content).toContain('TypeScript');
    });

    test('should include environment variables from .env.example', async () => {
      const repoPath = '/test/env-app';
      const repoMetadata = {
        name: 'env-app',
        languages: ['JavaScript'],
        frameworks: ['Express'],
        hasDocker: false,
        hasTests: false,
        packageJson: {
          name: 'env-app',
          version: '1.0.0',
          scripts: {
            start: 'node server.js',
          },
        },
      };

      // Mock .env.example exists
      mockFs.existsSync.mockImplementation((path) => {
        return path.includes('.env.example');
      });

      // Mock .env.example content
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('.env.example')) {
          return `# Database Configuration
DATABASE_URL=postgresql://localhost:5432/mydb
DATABASE_USER=admin
DATABASE_PASSWORD=secret123

# API Keys
API_KEY=your_api_key_here
SECRET_KEY=your_secret_key

# Server Configuration
PORT=3000
NODE_ENV=development`;
        }
        return '';
      });

      const result = await generateReadme(repoPath, repoMetadata);

      expect(result.content).toContain('## Environment Variables');
      expect(result.content).toContain('DATABASE_URL');
      expect(result.content).toContain('API_KEY');
      expect(result.content).toContain('PORT');
      expect(result.content).toContain('NODE_ENV');
      expect(result.content).toContain('.env.example');
      expect(result.content).toContain('Database Configuration');
    });

    test('should preserve existing README description', async () => {
      const repoPath = '/test/existing-readme';
      const repoMetadata = {
        name: 'existing-app',
        languages: ['Python'],
        frameworks: ['Flask'],
        hasDocker: true,
        hasTests: true,
        packageJson: null,
        pythonPackages: [
          { name: 'flask', version: '2.3.0' },
        ],
      };

      // Mock existing README
      mockFs.existsSync.mockImplementation((path) => {
        return path.includes('README.md');
      });

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('README.md')) {
          return `# Existing App

This is my custom description that should be preserved.
It has multiple lines and important information.

## Old Section
Some old content here.`;
        }
        return '';
      });

      const result = await generateReadme(repoPath, repoMetadata);

      expect(result.content).toContain('This is my custom description that should be preserved');
      expect(result.content).toContain('It has multiple lines and important information');
      expect(result.content).toContain('## Installation');
      expect(result.content).toContain('Flask');
    });

    test('should include Docker instructions when Docker is detected', async () => {
      const repoPath = '/test/docker-app';
      const repoMetadata = {
        name: 'docker-app',
        languages: ['JavaScript'],
        frameworks: ['Express'],
        hasDocker: true,
        hasTests: false,
        packageJson: {
          name: 'docker-app',
          version: '1.0.0',
          scripts: {
            start: 'node app.js',
          },
        },
      };

      mockFs.existsSync.mockReturnValue(false);

      const result = await generateReadme(repoPath, repoMetadata);

      expect(result.content).toContain('Docker');
      expect(result.content).toContain('docker-compose up');
      expect(result.content).toContain('docker build');
    });

    test('should include test instructions when tests are detected', async () => {
      const repoPath = '/test/tested-app';
      const repoMetadata = {
        name: 'tested-app',
        languages: ['TypeScript'],
        frameworks: ['React'],
        hasDocker: false,
        hasTests: true,
        testFrameworks: ['jest', 'react-testing-library'],
        packageJson: {
          name: 'tested-app',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            'test:coverage': 'jest --coverage',
          },
        },
      };

      mockFs.existsSync.mockReturnValue(false);

      const result = await generateReadme(repoPath, repoMetadata);

      expect(result.content).toContain('## Testing');
      expect(result.content).toContain('npm test');
      expect(result.content).toContain('jest');
    });

    test('should include badges for detected technologies', async () => {
      const repoPath = '/test/badge-app';
      const repoMetadata = {
        name: 'badge-app',
        languages: ['TypeScript', 'Python'],
        frameworks: ['React', 'Flask'],
        hasDocker: true,
        hasTests: true,
        ciTools: ['GitHub Actions'],
        packageJson: {
          name: 'badge-app',
          version: '1.0.0',
        },
      };

      mockFs.existsSync.mockReturnValue(false);

      const result = await generateReadme(repoPath, repoMetadata);

      // Check for badges
      expect(result.content).toContain('![TypeScript]');
      expect(result.content).toContain('![Python]');
      expect(result.content).toContain('![React]');
      expect(result.content).toContain('![Docker]');
    });

    test('should handle Python project with requirements.txt', async () => {
      const repoPath = '/test/python-app';
      const repoMetadata = {
        name: 'python-app',
        languages: ['Python'],
        frameworks: ['Django'],
        hasDocker: false,
        hasTests: true,
        testFrameworks: ['pytest'],
        packageJson: null,
        pythonPackages: [
          { name: 'django', version: '4.2.0' },
          { name: 'pytest', version: '7.4.0' },
        ],
      };

      mockFs.existsSync.mockReturnValue(false);

      const result = await generateReadme(repoPath, repoMetadata);

      expect(result.content).toContain('## Installation');
      expect(result.content).toContain('pip install -r requirements.txt');
      expect(result.content).toContain('Django');
      expect(result.content).toContain('pytest');
      expect(result.content).toContain('Python');
    });

    test('should include API routes if detected', async () => {
      const repoPath = '/test/api-app';
      const repoMetadata = {
        name: 'api-app',
        languages: ['JavaScript'],
        frameworks: ['Express'],
        hasDocker: false,
        hasTests: false,
        packageJson: {
          name: 'api-app',
          version: '1.0.0',
          description: 'REST API application',
        },
      };

      mockFs.existsSync.mockReturnValue(false);

      const result = await generateReadme(repoPath, repoMetadata);

      expect(result.content).toContain('## API');
      expect(result.content).toContain('Express');
    });
  });
});

// Made with Bob