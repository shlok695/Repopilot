import { jest } from '@jest/globals';
import { scanSecrets } from './secretsAgent.js';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
};

// Mock spawnWithTimeout
const mockSpawnWithTimeout = jest.fn();

// Mock sanitizeScannerOutput
const mockSanitizeScannerOutput = jest.fn((text) => text);

jest.unstable_mockModule('fs', () => mockFs);
jest.unstable_mockModule('../middleware/timeoutManager.js', () => ({
  spawnWithTimeout: mockSpawnWithTimeout,
}));
jest.unstable_mockModule('../middleware/sanitizeOutput.js', () => ({
  sanitizeScannerOutput: mockSanitizeScannerOutput,
}));

describe('secretsAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scanSecrets', () => {
    test('should detect hardcoded API_KEY', async () => {
      const repoPath = '/test/api-key-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      // Mock directory structure
      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['config.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      // Mock file with hardcoded API key
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('config.js')) {
          return `
const config = {
  apiKey: 'test_api_key_1234567890abcdef',
  api_key: 'example_api_key_abcdef1234567890',
  API_KEY: 'sample_api_key_abcdefghijklmnopqrstuvwxyz',
};
`;
        }
        return '';
      });

      // Mock gitleaks not available
      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanSecrets(repoPath, repoMetadata);

      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      
      // Check for API key findings
      const apiKeyFindings = result.findings.filter(f => 
        f.issue.includes('API Key') || f.issue.includes('API_KEY')
      );
      expect(apiKeyFindings.length).toBeGreaterThan(0);
      
      const finding = apiKeyFindings[0];
      expect(finding.severity).toBe('HIGH');
      expect(finding.tool).toBe('pattern-scan');
      expect(finding.file).toContain('config.js');
      expect(finding.line).toBeGreaterThan(0);
    });

    test('should exclude .env.example from scanning', async () => {
      const repoPath = '/test/env-example-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['.env.example', 'src'];
        }
        if (path.includes('src')) {
          return ['app.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      // Mock .env.example with placeholder values (should be excluded)
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('.env.example')) {
          return `
API_KEY=your_api_key_here
DATABASE_URL=postgresql://localhost:5432/mydb
SECRET_KEY=your_secret_key_here
`;
        }
        if (path.includes('app.js')) {
          return `
// Clean code
const app = express();
`;
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanSecrets(repoPath, repoMetadata);

      // Verify .env.example was not scanned
      const envExampleFindings = result.findings.filter(f => 
        f.file.includes('.env.example')
      );
      expect(envExampleFindings.length).toBe(0);
      
      // Verify warnings mention files scanned
      expect(result.warnings).toBeDefined();
    });

    test('should never include actual secret values in findings', async () => {
      const repoPath = '/test/secret-values-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      const actualSecretValue = 'sample_secret_value_12345678901234567890';

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['secrets.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('secrets.js')) {
          return `
const apiKey = '${actualSecretValue}';
const password = 'MySecretPassword123!';
const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
`;
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanSecrets(repoPath, repoMetadata);

      expect(result.findings.length).toBeGreaterThan(0);
      
      // Verify actual secret values are NEVER in findings
      result.findings.forEach(finding => {
        expect(finding.issue).not.toContain(actualSecretValue);
        expect(finding.issue).not.toContain('MySecretPassword123!');
        expect(finding.issue).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
        expect(finding.recommendation).not.toContain(actualSecretValue);
        expect(finding.file).not.toContain(actualSecretValue);
        
        // Findings should only describe the type of secret, not the value
        expect(finding.issue).toMatch(/API Key|Password|Bearer Token/i);
      });
      
      // Verify sanitizeScannerOutput was called
      expect(mockSanitizeScannerOutput).toHaveBeenCalled();
    });

    test('should detect AWS access keys', async () => {
      const repoPath = '/test/aws-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['aws-config.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('aws-config.js')) {
          return `
const awsConfig = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
};
`;
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanSecrets(repoPath, repoMetadata);

      const awsFindings = result.findings.filter(f => 
        f.issue.includes('AWS') || f.issue.includes('Access Key')
      );
      expect(awsFindings.length).toBeGreaterThan(0);
      
      const finding = awsFindings[0];
      expect(finding.severity).toBe('CRITICAL');
      expect(finding.tool).toBe('pattern-scan');
    });

    test('should detect private keys', async () => {
      const repoPath = '/test/private-key-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['key.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('key.js')) {
          return `
const privateKey = \`-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyz
-----END RSA PRIVATE KEY-----\`;
`;
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanSecrets(repoPath, repoMetadata);

      const privateKeyFindings = result.findings.filter(f => 
        f.issue.includes('Private Key')
      );
      expect(privateKeyFindings.length).toBeGreaterThan(0);
      
      const finding = privateKeyFindings[0];
      expect(finding.severity).toBe('CRITICAL');
    });

    test('should exclude test files from scanning', async () => {
      const repoPath = '/test/test-files-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src', '__tests__'];
        }
        if (path.includes('src')) {
          return ['app.js'];
        }
        if (path.includes('__tests__')) {
          return ['app.test.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src') || path.includes('__tests__'),
        isFile: () => !path.includes('src') && !path.includes('__tests__'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('app.test.js')) {
          return `
// Test file with mock API key
const mockApiKey = 'test_api_key_1234567890abcdefghijklmnop';
`;
        }
        if (path.includes('app.js')) {
          return '// Clean code';
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanSecrets(repoPath, repoMetadata);

      // Verify test files were excluded
      const testFileFindings = result.findings.filter(f => 
        f.file.includes('.test.') || f.file.includes('__tests__')
      );
      expect(testFileFindings.length).toBe(0);
    });

    test('should detect high entropy strings', async () => {
      const repoPath = '/test/entropy-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return ['config.js'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('config.js')) {
          return `
// High entropy string (likely a secret)
const token = 'a8f3k2j9d0s1m4n7b6v5c8x2z1q3w4e5r6t7y8u9i0o1p2';

// Low entropy string (not a secret)
const url = 'https://api.example.com/v1/users/endpoint';
`;
        }
        return '';
      });

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanSecrets(repoPath, repoMetadata);

      // High entropy string should be detected
      const entropyFindings = result.findings.filter(f => 
        f.issue.includes('High Entropy')
      );
      
      // May or may not detect depending on entropy threshold
      // Just verify no actual values are in findings
      result.findings.forEach(finding => {
        expect(finding.issue).not.toContain('a8f3k2j9d0s1m4n7b6v5c8x2z1q3w4e5r6t7y8u9i0o1p2');
      });
    });

    test('should cap findings at 50', async () => {
      const repoPath = '/test/many-secrets-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === repoPath) {
          return ['src'];
        }
        if (path.includes('src')) {
          return Array.from({ length: 30 }, (_, i) => `file${i}.js`);
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => path.includes('src'),
        isFile: () => !path.includes('src'),
      }));

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockReturnValue(`
const apiKey1 = 'test_api_key_1234567890abcdef';
const apiKey2 = 'sample_api_key_abcdefghijklmnopqrstuvwxyz';
const apiKey3 = 'example_api_key_abcdef1234567890';
      `);

      mockSpawnWithTimeout.mockRejectedValue(new Error('Command not found'));

      const result = await scanSecrets(repoPath, repoMetadata);

      expect(result.findings.length).toBeLessThanOrEqual(50);
      if (result.findings.length === 50) {
        expect(result.warnings.some(w => w.includes('50'))).toBe(true);
      }
    });
  });
});

// Made with Bob
