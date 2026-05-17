import { jest } from '@jest/globals';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
};

// Mock spawnWithTimeout
const mockSpawnWithTimeout = jest.fn();

jest.unstable_mockModule('fs', () => ({ ...mockFs, default: mockFs }));
jest.unstable_mockModule('fs/promises', () => ({
  readFile: jest.fn((path) => Promise.resolve(mockFs.readFileSync(path))),
}));
jest.unstable_mockModule('../middleware/timeoutManager.js', () => ({
  spawnWithTimeout: mockSpawnWithTimeout,
}));

const { scanLicenses } = await import('./licenseScannerAgent.js');

describe('licenseScannerAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSpawnWithTimeout.mockReset();
  });

  describe('scanLicenses', () => {
    test('should flag GPL package as problematic', async () => {
      const repoPath = '/test/gpl-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      // Mock LICENSE file
      mockFs.existsSync.mockImplementation((path) => {
        return path.includes('LICENSE') || path.includes('package.json');
      });

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('LICENSE')) {
          return 'MIT License\n\nCopyright (c) 2024';
        }
        if (path.includes('package.json')) {
          return JSON.stringify({
            name: 'test-app',
            dependencies: {},
          });
        }
        return '';
      });

      // Mock license-checker output with GPL package
      const licenseCheckerOutput = JSON.stringify({
        'gpl-package@1.0.0': {
          licenses: 'GPL-3.0',
          repository: 'https://github.com/example/gpl-package',
        },
        'mit-package@2.0.0': {
          licenses: 'MIT',
          repository: 'https://github.com/example/mit-package',
        },
        'apache-package@3.0.0': {
          licenses: 'Apache-2.0',
          repository: 'https://github.com/example/apache-package',
        },
      });

      mockSpawnWithTimeout.mockResolvedValueOnce({
        stdout: licenseCheckerOutput,
        stderr: '',
        code: 0,
      });

      const result = await scanLicenses(repoPath, repoMetadata);

      expect(result.licenses).toBeDefined();
      expect(result.licenses.length).toBe(3);
      
      // Check GPL package is flagged
      const gplPackage = result.licenses.find(l => l.package.includes('gpl-package'));
      expect(gplPackage).toBeDefined();
      expect(gplPackage.license).toBe('GPL-3.0');
      expect(gplPackage.problematic).toBe(true);
      expect(gplPackage.risk).toBe('high');
      expect(gplPackage.commercial).toBe('caution');
      
      // Check summary counts
      expect(result.summary.highCount).toBeGreaterThan(0);
    });

    test('should not flag MIT package as problematic', async () => {
      const repoPath = '/test/mit-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.existsSync.mockImplementation((path) => {
        return path.includes('LICENSE') || path.includes('package.json');
      });

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('LICENSE')) {
          return 'MIT License\n\nCopyright (c) 2024';
        }
        if (path.includes('package.json')) {
          return JSON.stringify({ name: 'test-app' });
        }
        return '';
      });

      // Mock license-checker output with only MIT packages
      const licenseCheckerOutput = JSON.stringify({
        'express@4.18.0': {
          licenses: 'MIT',
          repository: 'https://github.com/expressjs/express',
        },
        'lodash@4.17.21': {
          licenses: 'MIT',
          repository: 'https://github.com/lodash/lodash',
        },
        'axios@1.4.0': {
          licenses: 'MIT',
          repository: 'https://github.com/axios/axios',
        },
      });

      mockSpawnWithTimeout.mockResolvedValueOnce({
        stdout: licenseCheckerOutput,
        stderr: '',
        code: 0,
      });

      const result = await scanLicenses(repoPath, repoMetadata);

      expect(result.licenses).toBeDefined();
      expect(result.licenses.length).toBe(3);
      
      // Check all MIT packages are not problematic
      result.licenses.forEach(license => {
        expect(license.license).toBe('MIT');
        expect(license.problematic).toBe(false);
        expect(license.risk).toBe('low');
        expect(license.commercial).toBe('safe');
      });
      
      // Check summary
      expect(result.summary.highCount).toBe(0);
      expect(result.summary.criticalCount).toBe(0);
    });

    test('should add warning when license-checker not available', async () => {
      const repoPath = '/test/no-tool-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('MIT License');

      // Mock license-checker not available
      mockSpawnWithTimeout.mockRejectedValueOnce(new Error('Command not found: license-checker'));

      const result = await scanLicenses(repoPath, repoMetadata);

      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(w => 
        w.includes('license-checker') || w.includes('not available')
      )).toBe(true);
    });

    test('should detect repository license from LICENSE file', async () => {
      const repoPath = '/test/license-file-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.existsSync.mockImplementation((path) => {
        return path.includes('LICENSE');
      });

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('LICENSE')) {
          return `MIT License

Copyright (c) 2024 Test Company

Permission is hereby granted, free of charge...`;
        }
        return '';
      });

      mockSpawnWithTimeout.mockResolvedValueOnce({
        stdout: JSON.stringify({}),
        stderr: '',
        code: 0,
      });

      const result = await scanLicenses(repoPath, repoMetadata);

      expect(result.repoLicense).toBeDefined();
      expect(result.repoLicense.type).toBe('MIT');
      expect(result.repoLicense.file).toBe('LICENSE');
      expect(result.repoLicense.commercial).toBe('safe');
      expect(result.repoLicense.risk).toBe('low');
      expect(result.repoLicense.content).toBeDefined();
    });

    test('should flag AGPL as critical risk', async () => {
      const repoPath = '/test/agpl-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('MIT License');

      const licenseCheckerOutput = JSON.stringify({
        'agpl-package@1.0.0': {
          licenses: 'AGPL-3.0',
          repository: 'https://github.com/example/agpl-package',
        },
      });

      mockSpawnWithTimeout.mockResolvedValueOnce({
        stdout: licenseCheckerOutput,
        stderr: '',
        code: 0,
      });

      const result = await scanLicenses(repoPath, repoMetadata);

      const agplPackage = result.licenses.find(l => l.package.includes('agpl-package'));
      expect(agplPackage).toBeDefined();
      expect(agplPackage.license).toBe('AGPL-3.0');
      expect(agplPackage.problematic).toBe(true);
      expect(agplPackage.risk).toBe('critical');
      expect(agplPackage.commercial).toBe('caution');
      
      expect(result.summary.criticalCount).toBe(1);
    });

    test('should flag UNKNOWN licenses', async () => {
      const repoPath = '/test/unknown-license-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('MIT License');

      const licenseCheckerOutput = JSON.stringify({
        'unknown-package@1.0.0': {
          licenses: 'UNKNOWN',
          repository: 'https://github.com/example/unknown-package',
        },
      });

      mockSpawnWithTimeout.mockResolvedValueOnce({
        stdout: licenseCheckerOutput,
        stderr: '',
        code: 0,
      });

      const result = await scanLicenses(repoPath, repoMetadata);

      const unknownPackage = result.licenses.find(l => l.package.includes('unknown-package'));
      expect(unknownPackage).toBeDefined();
      expect(unknownPackage.license).toBe('UNKNOWN');
      expect(unknownPackage.problematic).toBe(true);
      expect(unknownPackage.risk).toBe('high');
      
      expect(result.summary.highCount).toBeGreaterThan(0);
    });

    test('should handle Python pip-licenses', async () => {
      const repoPath = '/test/python-repo';
      const repoMetadata = {
        languages: ['Python'],
        frameworks: ['Flask'],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('MIT License');

      // Mock pip-licenses output
      const pipLicensesOutput = JSON.stringify([
        {
          Name: 'flask',
          Version: '2.3.0',
          License: 'BSD-3-Clause',
        },
        {
          Name: 'django',
          Version: '4.2.0',
          License: 'BSD',
        },
      ]);

      mockSpawnWithTimeout.mockResolvedValueOnce({
        stdout: pipLicensesOutput,
        stderr: '',
        code: 0,
      });

      const result = await scanLicenses(repoPath, repoMetadata);

      expect(result.licenses).toBeDefined();
      expect(result.licenses.length).toBe(2);
      
      const flask = result.licenses.find(l => l.package === 'flask');
      expect(flask).toBeDefined();
      expect(flask.license).toContain('BSD');
      expect(flask.problematic).toBe(false);
      expect(flask.risk).toBe('low');
    });

    test('should include compatibility matrix', async () => {
      const repoPath = '/test/matrix-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('MIT License');

      mockSpawnWithTimeout.mockResolvedValueOnce({
        stdout: JSON.stringify({}),
        stderr: '',
        code: 0,
      });

      const result = await scanLicenses(repoPath, repoMetadata);

      expect(result.compatibilityMatrix).toBeDefined();
      expect(result.compatibilityMatrix['MIT']).toBeDefined();
      expect(result.compatibilityMatrix['MIT'].commercial).toBe('safe');
      expect(result.compatibilityMatrix['GPL']).toBeDefined();
      expect(result.compatibilityMatrix['GPL'].commercial).toBe('caution');
      expect(result.compatibilityMatrix['AGPL']).toBeDefined();
      expect(result.compatibilityMatrix['AGPL'].risk).toBe('critical');
    });

    test('should group licenses by type', async () => {
      const repoPath = '/test/grouped-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('MIT License');

      const licenseCheckerOutput = JSON.stringify({
        'pkg1@1.0.0': { licenses: 'MIT' },
        'pkg2@2.0.0': { licenses: 'MIT' },
        'pkg3@3.0.0': { licenses: 'Apache-2.0' },
        'pkg4@4.0.0': { licenses: 'MIT' },
      });

      mockSpawnWithTimeout.mockResolvedValueOnce({
        stdout: licenseCheckerOutput,
        stderr: '',
        code: 0,
      });

      const result = await scanLicenses(repoPath, repoMetadata);

      expect(result.summary.licenseGroups).toBeDefined();
      expect(result.summary.licenseGroups['MIT']).toBeDefined();
      expect(result.summary.licenseGroups['MIT'].length).toBe(3);
      expect(result.summary.licenseGroups['Apache-2.0']).toBeDefined();
      expect(result.summary.licenseGroups['Apache-2.0'].length).toBe(1);
    });

    test('should warn about missing LICENSE file', async () => {
      const repoPath = '/test/no-license-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: [],
      };

      mockFs.existsSync.mockReturnValue(false);

      mockSpawnWithTimeout.mockResolvedValueOnce({
        stdout: JSON.stringify({}),
        stderr: '',
        code: 0,
      });

      const result = await scanLicenses(repoPath, repoMetadata);

      expect(result.repoLicense.type).toBe('No LICENSE file');
      expect(result.repoLicense.file).toBeNull();
    });
  });
});

// Made with Bob
