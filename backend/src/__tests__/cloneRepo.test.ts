import { cloneRepo, ValidationError, TimeoutError, CloneError } from '../utils/cloneRepo';
import simpleGit from 'simple-git';
import { existsSync, readdirSync, mkdirSync } from 'fs';

// Mock dependencies
jest.mock('simple-git');
jest.mock('fs');

const mockSimpleGit = simpleGit as jest.MockedFunction<typeof simpleGit>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReaddirSync = readdirSync as jest.MockedFunction<typeof readdirSync>;
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;

describe('cloneRepo', () => {
  let mockGit: any;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock git instance
    mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
    };
    mockSimpleGit.mockReturnValue(mockGit as any);

    // Spy on console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Default mocks
    mockExistsSync.mockReturnValue(false);
    mockReaddirSync.mockReturnValue(['.git', 'README.md', 'package.json'] as any);
    mockMkdirSync.mockReturnValue(undefined as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  describe('Success Cases', () => {
    it('should clone valid GitHub URL successfully', async () => {
      const repoUrl = 'https://github.com/test/repo';
      const scanId = 'scan_123';

      const result = await cloneRepo(repoUrl, scanId);

      expect(result).toBe('/tmp/repopilot/repos/scan_123');
      expect(mockGit.clone).toHaveBeenCalledWith(
        repoUrl,
        '/tmp/repopilot/repos/scan_123',
        ['--depth', '1']
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[scan_123] Starting clone:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[scan_123] Clone completed in')
      );
    });

    it('should create parent directory if it does not exist', async () => {
      mockExistsSync
        .mockReturnValueOnce(false) // repoPath doesn't exist
        .mockReturnValueOnce(false); // parent dir doesn't exist

      await cloneRepo('https://github.com/test/repo', 'scan_123');

      expect(mockMkdirSync).toHaveBeenCalledWith(
        '/tmp/repopilot/repos',
        { recursive: true }
      );
    });
  });

  describe('Validation Errors', () => {
    it('should throw ValidationError for non-GitHub URL', async () => {
      await expect(
        cloneRepo('https://gitlab.com/test/repo', 'scan_123')
      ).rejects.toThrow(ValidationError);

      await expect(
        cloneRepo('https://gitlab.com/test/repo', 'scan_123')
      ).rejects.toThrow('Invalid GitHub URL');
    });

    it('should throw ValidationError for URL with shell metacharacters', async () => {
      await expect(
        cloneRepo('https://github.com/test/repo;rm -rf /', 'scan_123')
      ).rejects.toThrow(ValidationError);

      await expect(
        cloneRepo('https://github.com/test/repo|cat /etc/passwd', 'scan_123')
      ).rejects.toThrow('Invalid characters in repository URL');
    });

    it('should throw ValidationError for URL with backticks', async () => {
      await expect(
        cloneRepo('https://github.com/test/repo`whoami`', 'scan_123')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Pre-Clone Checks', () => {
    it('should throw CloneError if directory already exists', async () => {
      mockExistsSync.mockReturnValue(true);

      await expect(
        cloneRepo('https://github.com/test/repo', 'scan_123')
      ).rejects.toThrow(CloneError);

      await expect(
        cloneRepo('https://github.com/test/repo', 'scan_123')
      ).rejects.toThrow('Scan directory already exists');
    });
  });

  describe('Post-Clone Verification', () => {
    it('should throw CloneError for empty repository', async () => {
      mockReaddirSync.mockReturnValue(['.git'] as any);

      await expect(
        cloneRepo('https://github.com/test/repo', 'scan_123')
      ).rejects.toThrow(CloneError);

      await expect(
        cloneRepo('https://github.com/test/repo', 'scan_123')
      ).rejects.toThrow('Empty repo');
    });

    it('should throw CloneError for completely empty directory', async () => {
      mockReaddirSync.mockReturnValue([] as any);

      await expect(
        cloneRepo('https://github.com/test/repo', 'scan_123')
      ).rejects.toThrow(CloneError);

      await expect(
        cloneRepo('https://github.com/test/repo', 'scan_123')
      ).rejects.toThrow('Empty repo');
    });
  });

  describe('Timeout Handling', () => {
    it('should throw TimeoutError when clone takes too long', async () => {
      jest.useFakeTimers();
      mockGit.clone.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, 35000); // Longer than 30s timeout
        });
      });

      const promise = cloneRepo('https://github.com/test/repo', 'scan_123');
      jest.advanceTimersByTime(31000);

      await expect(promise).rejects.toThrow(TimeoutError);
      await expect(promise).rejects.toThrow('Clone timeout after 30s');
    });
  });

  describe('Network Error Retry Logic', () => {
    it('should retry once on network error and succeed', async () => {
      mockGit.clone
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce(undefined);

      const result = await cloneRepo('https://github.com/test/repo', 'scan_123');

      expect(result).toBe('/tmp/repopilot/repos/scan_123');
      expect(mockGit.clone).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying clone after network error')
      );
    });

    it('should throw CloneError after retry fails', async () => {
      mockGit.clone
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const promise = cloneRepo('https://github.com/test/repo', 'scan_123');

      await expect(promise).rejects.toThrow(CloneError);
      await expect(promise).rejects.toThrow('Network error');

      expect(mockGit.clone).toHaveBeenCalledTimes(2);
    });

    it('should retry on ETIMEDOUT error', async () => {
      mockGit.clone
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce(undefined);

      await cloneRepo('https://github.com/test/repo', 'scan_123');

      expect(mockGit.clone).toHaveBeenCalledTimes(2);
    });

    it('should retry on ENOTFOUND error', async () => {
      mockGit.clone
        .mockRejectedValueOnce(new Error('ENOTFOUND'))
        .mockResolvedValueOnce(undefined);

      await cloneRepo('https://github.com/test/repo', 'scan_123');

      expect(mockGit.clone).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should throw CloneError for repository not found', async () => {
      mockGit.clone.mockRejectedValue(new Error('Repository not found (404)'));

      await expect(
        cloneRepo('https://github.com/test/nonexistent', 'scan_123')
      ).rejects.toThrow(CloneError);

      await expect(
        cloneRepo('https://github.com/test/nonexistent', 'scan_123')
      ).rejects.toThrow('Repository not found');
    });

    it('should throw CloneError for generic errors', async () => {
      mockGit.clone.mockRejectedValue(new Error('Permission denied'));

      await expect(
        cloneRepo('https://github.com/test/repo', 'scan_123')
      ).rejects.toThrow(CloneError);

      await expect(
        cloneRepo('https://github.com/test/repo', 'scan_123')
      ).rejects.toThrow('Failed to clone repository: Permission denied');
    });

    it('should not retry on non-network errors', async () => {
      mockGit.clone.mockRejectedValue(new Error('Permission denied'));

      await expect(
        cloneRepo('https://github.com/test/repo', 'scan_123')
      ).rejects.toThrow(CloneError);

      expect(mockGit.clone).toHaveBeenCalledTimes(1); // No retry
    });
  });

  describe('URL Sanitization', () => {
    it('should reject GitHub URLs with credentials', async () => {
      const repoUrl = 'https://user:password@github.com/test/repo';

      await expect(cloneRepo(repoUrl, 'scan_123')).rejects.toThrow(ValidationError);
    });

    it('should handle URLs without credentials normally', async () => {
      const repoUrl = 'https://github.com/test/repo';

      await cloneRepo(repoUrl, 'scan_123');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/test/repo')
      );
    });
  });

  describe('Performance Logging', () => {
    it('should log clone duration', async () => {
      await cloneRepo('https://github.com/test/repo', 'scan_123');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[scan_123\] Clone completed in \d+ms/)
      );
    });
  });
});

// Made with Bob
