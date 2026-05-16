import { jest } from '@jest/globals';
import { inventoryDependencies } from './dependencyInventoryAgent.js';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
};

jest.unstable_mockModule('fs', () => mockFs);

describe('dependencyInventoryAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('inventoryDependencies', () => {
    test('should parse package.json correctly', async () => {
      const repoPath = '/test/node-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
        frameworks: ['Express'],
      };

      // Mock package.json exists
      mockFs.existsSync.mockImplementation((path) => {
        return path.includes('package.json');
      });

      // Mock package.json content
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            name: 'test-app',
            version: '1.0.0',
            dependencies: {
              express: '^4.18.0',
              lodash: '4.17.21',
              axios: '~1.4.0',
            },
            devDependencies: {
              jest: '^29.7.0',
              eslint: '8.56.0',
            },
          });
        }
        return '';
      });

      const result = await inventoryDependencies(repoPath, repoMetadata);

      expect(result.production).toBeDefined();
      expect(result.production.length).toBe(3);
      expect(result.development).toBeDefined();
      expect(result.development.length).toBe(2);
      
      // Check specific packages
      const express = result.production.find(d => d.name === 'express');
      expect(express).toBeDefined();
      expect(express.version).toBe('^4.18.0');
      expect(express.type).toBe('production');
      
      const lodash = result.production.find(d => d.name === 'lodash');
      expect(lodash).toBeDefined();
      expect(lodash.version).toBe('4.17.21');
      
      const jest = result.development.find(d => d.name === 'jest');
      expect(jest).toBeDefined();
      expect(jest.version).toBe('^29.7.0');
      expect(jest.type).toBe('development');
    });

    test('should flag ^ version as unpinned', async () => {
      const repoPath = '/test/unpinned-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      mockFs.existsSync.mockImplementation((path) => {
        return path.includes('package.json');
      });

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              'package-a': '^1.0.0',
              'package-b': '~2.0.0',
              'package-c': '3.0.0',
              'package-d': '>=4.0.0',
              'package-e': '*',
            },
          });
        }
        return '';
      });

      const result = await inventoryDependencies(repoPath, repoMetadata);

      // Check unpinned flags
      const packageA = result.production.find(d => d.name === 'package-a');
      expect(packageA.unpinned).toBe(true); // ^ is unpinned
      
      const packageB = result.production.find(d => d.name === 'package-b');
      expect(packageB.unpinned).toBe(true); // ~ is unpinned
      
      const packageC = result.production.find(d => d.name === 'package-c');
      expect(packageC.unpinned).toBe(false); // exact version is pinned
      
      const packageD = result.production.find(d => d.name === 'package-d');
      expect(packageD.unpinned).toBe(true); // >= is unpinned
      
      const packageE = result.production.find(d => d.name === 'package-e');
      expect(packageE.unpinned).toBe(true); // * is unpinned
      
      // Check unpinned count
      expect(result.unpinnedCount).toBe(4); // A, B, D, E are unpinned
    });

    test('should parse requirements.txt correctly', async () => {
      const repoPath = '/test/python-repo';
      const repoMetadata = {
        languages: ['Python'],
      };

      mockFs.existsSync.mockImplementation((path) => {
        if (path.includes('requirements.txt')) return true;
        return false;
      });

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('requirements.txt')) {
          return `# Python dependencies
flask==2.3.0
django>=4.2.0
requests~=2.28.0
pytest
numpy==1.24.0
pandas>=1.5.0`;
        }
        return '';
      });

      const result = await inventoryDependencies(repoPath, repoMetadata);

      expect(result.python).toBeDefined();
      expect(result.python.length).toBe(6);
      
      // Check flask (pinned with ==)
      const flask = result.python.find(d => d.name === 'flask');
      expect(flask).toBeDefined();
      expect(flask.version).toBe('2.3.0');
      expect(flask.unpinned).toBe(false); // == is pinned
      expect(flask.type).toBe('python');
      
      // Check django (unpinned with >=)
      const django = result.python.find(d => d.name === 'django');
      expect(django).toBeDefined();
      expect(django.version).toBe('4.2.0');
      expect(django.unpinned).toBe(true); // >= is unpinned
      
      // Check requests (unpinned with ~=)
      const requests = result.python.find(d => d.name === 'requests');
      expect(requests).toBeDefined();
      expect(requests.unpinned).toBe(true); // ~= is unpinned
      
      // Check pytest (no version)
      const pytest = result.python.find(d => d.name === 'pytest');
      expect(pytest).toBeDefined();
      expect(pytest.version).toBe('not specified');
      expect(pytest.unpinned).toBe(true); // no version is unpinned
    });

    test('should calculate total and unpinned counts', async () => {
      const repoPath = '/test/mixed-repo';
      const repoMetadata = {
        languages: ['JavaScript', 'Python'],
      };

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              'pkg1': '^1.0.0', // unpinned
              'pkg2': '2.0.0',  // pinned
            },
            devDependencies: {
              'pkg3': '~3.0.0', // unpinned
            },
          });
        }
        if (path.includes('requirements.txt')) {
          return `pkg4==1.0.0
pkg5>=2.0.0`;
        }
        return '';
      });

      const result = await inventoryDependencies(repoPath, repoMetadata);

      expect(result.totalCount).toBe(5); // 2 prod + 1 dev + 2 python
      expect(result.unpinnedCount).toBe(3); // pkg1, pkg3, pkg5
      
      expect(result.production.length).toBe(2);
      expect(result.development.length).toBe(1);
      expect(result.python.length).toBe(2);
    });

    test('should detect end-of-life packages', async () => {
      const repoPath = '/test/eol-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              'react': '15.0.0', // EOL version
              'angular': '1.8.0', // EOL version
              'vue': '3.3.0', // Current version
            },
          });
        }
        return '';
      });

      const result = await inventoryDependencies(repoPath, repoMetadata);

      const react = result.production.find(d => d.name === 'react');
      expect(react.eol).toBe(true);
      
      const angular = result.production.find(d => d.name === 'angular');
      expect(angular.eol).toBe(true);
      
      const vue = result.production.find(d => d.name === 'vue');
      expect(vue.eol).toBe(false);
      
      expect(result.eolCount).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('end-of-life'))).toBe(true);
    });

    test('should detect duplicate packages', async () => {
      const repoPath = '/test/dup-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            dependencies: {
              'lodash': '4.17.21',
              'lodash-es': '4.17.21', // Alias of lodash
              'axios': '1.4.0',
              'node-fetch': '3.3.0', // Similar to axios
            },
          });
        }
        return '';
      });

      const result = await inventoryDependencies(repoPath, repoMetadata);

      expect(result.duplicates).toBeDefined();
      expect(result.duplicates.length).toBeGreaterThan(0);
      
      // Check for lodash duplicate
      const lodashDup = result.duplicates.find(d => 
        d.package === 'lodash' || d.aliases?.includes('lodash-es')
      );
      expect(lodashDup).toBeDefined();
      
      expect(result.warnings.some(w => 
        w.includes('lodash') || w.includes('similar')
      )).toBe(true);
    });

    test('should handle missing package.json gracefully', async () => {
      const repoPath = '/test/no-package-repo';
      const repoMetadata = {
        languages: ['JavaScript'],
      };

      mockFs.existsSync.mockReturnValue(false);

      const result = await inventoryDependencies(repoPath, repoMetadata);

      expect(result.production).toEqual([]);
      expect(result.development).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.warnings.some(w => w.includes('No package.json'))).toBe(true);
    });

    test('should handle missing requirements.txt gracefully', async () => {
      const repoPath = '/test/no-requirements-repo';
      const repoMetadata = {
        languages: ['Python'],
      };

      mockFs.existsSync.mockReturnValue(false);

      const result = await inventoryDependencies(repoPath, repoMetadata);

      expect(result.python).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.warnings.some(w => w.includes('No requirements.txt'))).toBe(true);
    });

    test('should parse requirements.txt with comments and extras', async () => {
      const repoPath = '/test/complex-requirements';
      const repoMetadata = {
        languages: ['Python'],
      };

      mockFs.existsSync.mockReturnValue(true);

      mockFs.readFileSync.mockImplementation((path) => {
        if (path.includes('requirements.txt')) {
          return `# Main dependencies
flask==2.3.0  # Web framework
django>=4.2.0  # Another framework

# Testing
pytest[dev]==7.4.0  # With extras
requests~=2.28.0  # HTTP library

# Empty lines and comments

numpy==1.24.0  # Scientific computing`;
        }
        return '';
      });

      const result = await inventoryDependencies(repoPath, repoMetadata);

      expect(result.python.length).toBe(5);
      
      // Check pytest (should strip [dev] extra)
      const pytest = result.python.find(d => d.name === 'pytest');
      expect(pytest).toBeDefined();
      expect(pytest.name).toBe('pytest');
      expect(pytest.version).toBe('7.4.0');
    });
  });
});

// Made with Bob