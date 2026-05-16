import {
  saveScanResult,
  getScanResult,
  saveReport,
  getReportPath,
  listRecentScans,
  cleanupScanFolder,
  autoCleanup,
  NotFoundError,
  StorageError
} from '../utils/storage';
import { writeFile, readFile, readdir, stat, mkdir, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('fs/promises');

const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockReaddir = readdir as jest.MockedFunction<typeof readdir>;
const mockStat = stat as jest.MockedFunction<typeof stat>;
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockRm = rm as jest.MockedFunction<typeof rm>;
const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe('storage', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Default mocks
    mockExistsSync.mockReturnValue(true);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue('{}');
    mockRm.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('saveScanResult', () => {
    it('should save scan result to JSON file', async () => {
      const scanId = 'scan_123';
      const result = { scanId, status: 'completed', data: 'test' };

      await saveScanResult(scanId, result);

      expect(mockMkdir).toHaveBeenCalledWith(
        '/tmp/repopilot/results',
        { recursive: true }
      );
      
      // Parse the written JSON to check it includes createdAt
      const writtenJson = mockWriteFile.mock.calls[0][1] as string;
      const parsed = JSON.parse(writtenJson);
      
      expect(parsed).toMatchObject({
        scanId: 'scan_123',
        status: 'completed',
        data: 'test',
      });
      expect(parsed.createdAt).toEqual(expect.any(Number));
      
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/tmp/repopilot/results/scan_123.json',
        expect.any(String),
        'utf-8'
      );
    });

    it('should create directory if it does not exist', async () => {
      const scanId = 'scan_123';
      const result = { scanId, status: 'completed' };

      await saveScanResult(scanId, result);

      expect(mockMkdir).toHaveBeenCalledWith(
        '/tmp/repopilot/results',
        { recursive: true }
      );
    });

    it('should throw StorageError on write failure', async () => {
      mockWriteFile.mockRejectedValue(new Error('Write failed'));

      await expect(
        saveScanResult('scan_123', { data: 'test' })
      ).rejects.toThrow(StorageError);

      await expect(
        saveScanResult('scan_123', { data: 'test' })
      ).rejects.toThrow('Failed to save scan result');
    });

    it('should handle EEXIST error when directory exists', async () => {
      const eexistError: any = new Error('Directory exists');
      eexistError.code = 'EEXIST';
      mockMkdir.mockRejectedValue(eexistError);

      await saveScanResult('scan_123', { scanId: 'scan_123', status: 'completed' });

      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('getScanResult', () => {
    it('should read and return scan result', async () => {
      const scanId = 'scan_123';
      const mockResult = { scanId, status: 'completed', data: 'test' };
      
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockResult));

      const result = await getScanResult(scanId);

      expect(result).toEqual(mockResult);
      expect(mockReadFile).toHaveBeenCalledWith(
        '/tmp/repopilot/results/scan_123.json',
        'utf-8'
      );
    });

    it('should throw NotFoundError for missing scanId', async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(getScanResult('scan_missing')).rejects.toThrow(NotFoundError);
      await expect(getScanResult('scan_missing')).rejects.toThrow('Scan result not found: scan_missing');
    });

    it('should throw StorageError for invalid JSON', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('invalid json{');

      await expect(getScanResult('scan_123')).rejects.toThrow(StorageError);
      await expect(getScanResult('scan_123')).rejects.toThrow('Failed to read scan result');
    });

    it('should validate required field: scanId', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify({ status: 'completed' }));

      await expect(getScanResult('scan_123')).rejects.toThrow(StorageError);
      await expect(getScanResult('scan_123')).rejects.toThrow('missing required fields');
    });

    it('should validate required field: status', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify({ scanId: 'scan_123' }));

      await expect(getScanResult('scan_123')).rejects.toThrow(StorageError);
      await expect(getScanResult('scan_123')).rejects.toThrow('missing required fields');
    });

    it('should accept result with both required fields', async () => {
      const mockResult = { scanId: 'scan_123', status: 'completed' };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockResult));

      const result = await getScanResult('scan_123');

      expect(result).toEqual(mockResult);
    });
  });

  describe('saveReport', () => {
    it('should save report markdown file', async () => {
      const scanId = 'scan_123';
      const markdown = '# Test Report\n\nContent here';

      await saveReport(scanId, markdown);

      expect(mockMkdir).toHaveBeenCalledWith(
        '/tmp/repopilot/reports',
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/tmp/repopilot/reports/scan_123.md',
        markdown,
        'utf-8'
      );
    });

    it('should create directory if it does not exist', async () => {
      await saveReport('scan_123', '# Report');

      expect(mockMkdir).toHaveBeenCalledWith(
        '/tmp/repopilot/reports',
        { recursive: true }
      );
    });

    it('should throw StorageError on write failure', async () => {
      mockWriteFile.mockRejectedValue(new Error('Write failed'));

      await expect(
        saveReport('scan_123', '# Report')
      ).rejects.toThrow(StorageError);

      await expect(
        saveReport('scan_123', '# Report')
      ).rejects.toThrow('Failed to save report');
    });
  });

  describe('getReportPath', () => {
    it('should return path for existing report', () => {
      mockExistsSync.mockReturnValue(true);

      const path = getReportPath('scan_123');

      expect(path).toBe('/tmp/repopilot/reports/scan_123.md');
    });

    it('should throw NotFoundError for missing report', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => getReportPath('scan_missing')).toThrow(NotFoundError);
      expect(() => getReportPath('scan_missing')).toThrow('Report not found: scan_missing');
    });
  });

  describe('listRecentScans', () => {
    it('should return scanIds sorted by mtime', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['scan_1.json', 'scan_2.json', 'scan_3.json'] as any);
      
      // Mock readFile to return valid scan results with createdAt timestamps
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify({ scanId: 'scan_1', status: 'completed', createdAt: new Date('2024-01-01').getTime() }))
        .mockResolvedValueOnce(JSON.stringify({ scanId: 'scan_2', status: 'completed', createdAt: new Date('2024-01-03').getTime() }))
        .mockResolvedValueOnce(JSON.stringify({ scanId: 'scan_3', status: 'completed', createdAt: new Date('2024-01-02').getTime() }));

      const scans = await listRecentScans(10);

      // Now returns objects, sorted by createdAt descending
      expect(scans.map(scan => scan.scanId)).toEqual(['scan_2', 'scan_3', 'scan_1']);
    });

    it('should limit results to specified number', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['scan_1.json', 'scan_2.json', 'scan_3.json'] as any);
      
      mockStat.mockResolvedValue({ mtime: new Date() } as any);

      const scans = await listRecentScans(2);

      expect(scans).toHaveLength(2);
    });

    it('should return empty array if directory missing', async () => {
      mockExistsSync.mockReturnValue(false);

      const scans = await listRecentScans();

      expect(scans).toEqual([]);
    });

    it('should filter out non-JSON files', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['scan_1.json', 'readme.txt', 'scan_2.json'] as any);
      
      // Mock readFile for the JSON files only
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify({ scanId: 'scan_1', status: 'completed', createdAt: Date.now() }))
        .mockResolvedValueOnce(JSON.stringify({ scanId: 'scan_2', status: 'completed', createdAt: Date.now() }));

      const scans = await listRecentScans();

      expect(scans).toHaveLength(2);
      expect(scans.map(scan => scan.scanId)).toEqual(['scan_1', 'scan_2']);
    });

    it('should return empty array on error', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockRejectedValue(new Error('Read failed'));

      const scans = await listRecentScans();

      expect(scans).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('cleanupScanFolder', () => {
    it('should remove all scan files', async () => {
      mockExistsSync.mockReturnValue(true);

      await cleanupScanFolder('scan_123');

      expect(mockRm).toHaveBeenCalledWith(
        '/tmp/repopilot/repos/scan_123',
        { recursive: true, force: true }
      );
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/repopilot/results/scan_123.json');
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/repopilot/reports/scan_123.md');
    });

    it('should log cleanup operations', async () => {
      mockExistsSync.mockReturnValue(true);

      await cleanupScanFolder('scan_123');

      expect(consoleLogSpy).toHaveBeenCalledWith('[scan_123] Starting cleanup...');
      expect(consoleLogSpy).toHaveBeenCalledWith('[scan_123] Deleted repo folder');
      expect(consoleLogSpy).toHaveBeenCalledWith('[scan_123] Deleted result file');
      expect(consoleLogSpy).toHaveBeenCalledWith('[scan_123] Deleted report file');
      expect(consoleLogSpy).toHaveBeenCalledWith('[scan_123] Cleanup completed');
    });

    it('should ignore errors for missing files', async () => {
      mockExistsSync.mockReturnValue(false);

      await cleanupScanFolder('scan_123');

      expect(mockRm).not.toHaveBeenCalled();
      expect(mockUnlink).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('[scan_123] Cleanup completed');
    });

    it('should log warnings on deletion failures', async () => {
      mockExistsSync.mockReturnValue(true);
      mockRm.mockRejectedValue(new Error('Delete failed'));
      mockUnlink.mockRejectedValue(new Error('Delete failed'));

      await cleanupScanFolder('scan_123');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith('[scan_123] Cleanup completed');
    });
  });

  describe('autoCleanup', () => {
    it('should remove scans older than 2 hours', async () => {
      const now = Date.now();
      const threeHoursAgo = new Date(now - 3 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000);

      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['scan_old', 'scan_recent'] as any);
      
      mockStat
        .mockResolvedValueOnce({
          mtime: {
            getTime: () => threeHoursAgo.getTime()
          }
        } as any)
        .mockResolvedValueOnce({
          mtime: {
            getTime: () => oneHourAgo.getTime()
          }
        } as any);

      await autoCleanup();

      expect(consoleLogSpy).toHaveBeenCalledWith('[AutoCleanup] Removing old scan: scan_old');
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[AutoCleanup] Removing old scan: scan_recent')
      );
    });

    it('should keep recent scans', async () => {
      const now = Date.now();
      const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000);

      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['scan_recent'] as any);
      mockStat.mockResolvedValue({
        mtime: {
          getTime: () => oneHourAgo.getTime()
        }
      } as any);

      await autoCleanup();

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[AutoCleanup] Removing old scan')
      );
    });

    it('should return early if repos directory missing', async () => {
      mockExistsSync.mockReturnValue(false);

      await autoCleanup();

      expect(mockReaddir).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockRejectedValue(new Error('Read failed'));

      await autoCleanup();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AutoCleanup] Error during cleanup:',
        expect.any(Error)
      );
    });

    it('should continue on individual folder errors', async () => {
      const now = Date.now();
      const threeHoursAgo = new Date(now - 3 * 60 * 60 * 1000);

      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['scan_error', 'scan_old'] as any);
      
      mockStat
        .mockRejectedValueOnce(new Error('Stat failed'))
        .mockResolvedValueOnce({ mtime: threeHoursAgo } as any);

      await autoCleanup();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[AutoCleanup] Failed to check folder scan_error:',
        expect.any(Error)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('[AutoCleanup] Removing old scan: scan_old');
    });
  });
});

// Made with Bob
