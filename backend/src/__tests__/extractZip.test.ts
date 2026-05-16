import { extractZip, ExtractionError } from '../utils/extractZip';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import unzipper from 'unzipper';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('fs');
jest.mock('fs/promises');
jest.mock('unzipper');

const mockCreateReadStream = createReadStream as jest.MockedFunction<typeof createReadStream>;
const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
const mockReaddirSync = readdirSync as jest.MockedFunction<typeof readdirSync>;
const mockStatSync = statSync as jest.MockedFunction<typeof statSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;
const mockUnzipper = unzipper as jest.Mocked<typeof unzipper>;

describe('extractZip', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let mockStream: EventEmitter;
  let mockReadStream: EventEmitter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Mock streams
    mockReadStream = new EventEmitter();
    mockStream = new EventEmitter();

    (mockReadStream as any).pipe = jest.fn().mockReturnValue(mockStream);
    mockCreateReadStream.mockReturnValue(mockReadStream as any);

    // Default mocks
    mockExistsSync.mockReturnValue(true);
    mockMkdirSync.mockReturnValue(undefined as any);
    mockReaddirSync.mockReturnValue(['file1.txt', 'file2.js'] as any);
    mockStatSync.mockReturnValue({ isFile: () => true } as any);
    mockUnlink.mockResolvedValue(undefined);

    // Mock unzipper.Parse
    mockUnzipper.Parse = jest.fn().mockReturnValue(mockStream);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Success Cases', () => {
    it('should extract valid ZIP successfully', async () => {
      const zipPath = '/tmp/test.zip';
      const scanId = 'scan_123';

      // Simulate successful extraction
      setTimeout(() => {
        // Emit a valid entry
        mockStream.emit('entry', {
          path: 'file.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
          pipe: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      const result = await extractZip(zipPath, scanId);

      expect(result).toBe('/tmp/repopilot/repos/scan_123');
      expect(mockUnlink).toHaveBeenCalledWith(zipPath);
      expect(consoleLogSpy).toHaveBeenCalledWith('[scan_123] Starting ZIP extraction');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[scan_123] Extracted 2 files')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('[scan_123] Deleted ZIP file');
    });

    it('should create extract directory if it does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      setTimeout(() => {
        mockStream.emit('entry', {
          path: 'file.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
          pipe: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      await extractZip('/tmp/test.zip', 'scan_123');

      expect(mockMkdirSync).toHaveBeenCalledWith(
        '/tmp/repopilot/repos/scan_123',
        { recursive: true }
      );
    });
  });

  describe('Path Traversal Protection', () => {
    it('should skip and log path traversal attempts', async () => {
      const mockEntry = {
        path: '../../../etc/passwd',
        type: 'File',
        vars: { uncompressedSize: 1024 },
        autodrain: jest.fn(),
        pipe: jest.fn(),
      };

      setTimeout(() => {
        mockStream.emit('entry', mockEntry);
        mockStream.emit('entry', {
          path: 'safe.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
          pipe: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      await extractZip('/tmp/test.zip', 'scan_123');

      expect(mockEntry.autodrain).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[scan_123] Skipped path traversal: ../../../etc/passwd'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('skipped 1')
      );
    });

    it('should skip multiple path traversal patterns', async () => {
      setTimeout(() => {
        mockStream.emit('entry', {
          path: '../../file1.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
        });
        mockStream.emit('entry', {
          path: 'subdir/../../../file2.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
        });
        mockStream.emit('entry', {
          path: 'safe.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
          pipe: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      await extractZip('/tmp/test.zip', 'scan_123');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('skipped 2')
      );
    });
  });

  describe('macOS Metadata Filtering', () => {
    it('should skip __MACOSX directories', async () => {
      const mockEntry = {
        path: '__MACOSX/._file.txt',
        type: 'File',
        vars: { uncompressedSize: 1024 },
        autodrain: jest.fn(),
      };

      setTimeout(() => {
        mockStream.emit('entry', mockEntry);
        mockStream.emit('entry', {
          path: 'file.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
          pipe: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      await extractZip('/tmp/test.zip', 'scan_123');

      expect(mockEntry.autodrain).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('skipped 1')
      );
    });
  });

  describe('Zip Bomb Protection', () => {
    it('should reject ZIP with too many entries', async () => {
      setTimeout(() => {
        // Emit 5001 entries
        for (let i = 0; i <= 5000; i++) {
          mockStream.emit('entry', {
            path: `file${i}.txt`,
            type: 'File',
            vars: { uncompressedSize: 1024 },
            autodrain: jest.fn(),
            pipe: jest.fn(),
          });
        }
      }, 10);

      const promise = extractZip('/tmp/test.zip', 'scan_123');
      await expect(promise).rejects.toThrow(ExtractionError);
      await expect(promise).rejects.toThrow('ZIP contains too many files (>5000)');
    });

    it('should reject file larger than 10MB', async () => {
      setTimeout(() => {
        mockStream.emit('entry', {
          path: 'large.bin',
          type: 'File',
          vars: { uncompressedSize: 11 * 1024 * 1024 }, // 11 MB
          autodrain: jest.fn(),
        });
      }, 10);

      const promise = extractZip('/tmp/test.zip', 'scan_123');
      await expect(promise).rejects.toThrow(ExtractionError);
      await expect(promise).rejects.toThrow('ZIP contains file larger than 10MB');
    });

    it('should accept file exactly 10MB', async () => {
      setTimeout(() => {
        mockStream.emit('entry', {
          path: 'exactly10mb.bin',
          type: 'File',
          vars: { uncompressedSize: 10 * 1024 * 1024 }, // Exactly 10 MB
          autodrain: jest.fn(),
          pipe: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      await expect(extractZip('/tmp/test.zip', 'scan_123')).resolves.toBe(
        '/tmp/repopilot/repos/scan_123'
      );
    });
  });

  describe('Empty ZIP Detection', () => {
    it('should throw ExtractionError for empty ZIP', async () => {
      mockReaddirSync.mockReturnValue([] as any);

      setTimeout(() => {
        mockStream.emit('close');
      }, 10);

      const promise = extractZip('/tmp/empty.zip', 'scan_123');
      await expect(promise).rejects.toThrow(ExtractionError);
      await expect(promise).rejects.toThrow('Empty ZIP');
    });

    it('should throw ExtractionError for ZIP with only directories', async () => {
      mockReaddirSync.mockReturnValue(['dir1', 'dir2'] as any);
      mockStatSync.mockReturnValue({ isFile: () => false } as any);

      setTimeout(() => {
        mockStream.emit('entry', {
          path: 'dir1/',
          type: 'Directory',
          vars: { uncompressedSize: 0 },
          autodrain: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      const promise = extractZip('/tmp/test.zip', 'scan_123');
      await expect(promise).rejects.toThrow(ExtractionError);
      await expect(promise).rejects.toThrow('Empty ZIP');
    });
  });

  describe('Cleanup Behavior', () => {
    it('should delete ZIP file after successful extraction', async () => {
      setTimeout(() => {
        mockStream.emit('entry', {
          path: 'file.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
          pipe: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      await extractZip('/tmp/test.zip', 'scan_123');

      expect(mockUnlink).toHaveBeenCalledWith('/tmp/test.zip');
      expect(consoleLogSpy).toHaveBeenCalledWith('[scan_123] Deleted ZIP file');
    });

    it('should delete ZIP file even on extraction error', async () => {
      setTimeout(() => {
        mockStream.emit('error', new Error('Extraction failed'));
      }, 10);

      await expect(extractZip('/tmp/test.zip', 'scan_123')).rejects.toThrow();

      expect(mockUnlink).toHaveBeenCalledWith('/tmp/test.zip');
    });

    it('should log warning if ZIP deletion fails', async () => {
      mockUnlink.mockRejectedValue(new Error('Permission denied'));

      setTimeout(() => {
        mockStream.emit('entry', {
          path: 'file.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
          pipe: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      await extractZip('/tmp/test.zip', 'scan_123');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[scan_123] Failed to delete ZIP:',
        expect.any(Error)
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw ExtractionError on stream error', async () => {
      setTimeout(() => {
        mockStream.emit('error', new Error('Corrupt ZIP'));
      }, 10);

      await expect(extractZip('/tmp/corrupt.zip', 'scan_123')).rejects.toThrow();
    });

    it('should handle directory creation', async () => {
      mockExistsSync.mockReturnValue(false);

      setTimeout(() => {
        mockStream.emit('entry', {
          path: 'subdir/',
          type: 'Directory',
          vars: { uncompressedSize: 0 },
          autodrain: jest.fn(),
        });
        mockStream.emit('entry', {
          path: 'file.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
          pipe: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      await extractZip('/tmp/test.zip', 'scan_123');

      expect(mockMkdirSync).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log extraction start', async () => {
      setTimeout(() => {
        mockStream.emit('entry', {
          path: 'file.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
          pipe: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      await extractZip('/tmp/test.zip', 'scan_123');

      expect(consoleLogSpy).toHaveBeenCalledWith('[scan_123] Starting ZIP extraction');
    });

    it('should log file count and skipped count', async () => {
      setTimeout(() => {
        mockStream.emit('entry', {
          path: '../bad.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
        });
        mockStream.emit('entry', {
          path: 'good.txt',
          type: 'File',
          vars: { uncompressedSize: 1024 },
          autodrain: jest.fn(),
          pipe: jest.fn(),
        });
        mockStream.emit('close');
      }, 10);

      await extractZip('/tmp/test.zip', 'scan_123');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[scan_123\] Extracted \d+ files \(skipped 1\)/)
      );
    });
  });
});

// Made with Bob
