import { jest } from '@jest/globals';
import { TimeoutError, withTimeout, withRetry, spawnWithTimeout } from '../timeoutManager.js';

describe('timeoutManager', () => {

  describe('withTimeout', () => {
    test('resolves if promise completes before timeout', async () => {
      const fastPromise = new Promise(resolve => setTimeout(() => resolve('success'), 10));
      const result = await withTimeout(fastPromise, 100, 'Test');
      expect(result).toBe('success');
    });

    test('rejects with TimeoutError if promise takes too long', async () => {
      await expect(withTimeout(new Promise(resolve => setTimeout(() => resolve('success'), 100)), 10, 'SlowTest')).rejects.toThrow(TimeoutError);
      await expect(withTimeout(new Promise(resolve => setTimeout(() => resolve('success'), 100)), 10, 'SlowTest')).rejects.toThrow('SlowTest timed out after 10ms');
    });
  });

  describe('withRetry', () => {
    test('resolves immediately if function succeeds', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(mockFn, 3, 10);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('retries specified number of times then succeeds', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');
      
      const result = await withRetry(mockFn, 3, 10);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    test('throws last error if all retries fail', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      
      await expect(withRetry(mockFn, 2, 10)).rejects.toThrow('Persistent failure');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('spawnWithTimeout', () => {
    test('resolves with stdout and stderr on successful command', async () => {
      const result = await spawnWithTimeout('node', ['-e', '"console.log(\'hello\')"'], process.cwd(), 5000);
      expect(result.stdout).toContain('hello');
      expect(result.code).toBe(0);
    });

    test('kills process and rejects with TimeoutError on timeout', async () => {
      // Create a process that runs for 5 seconds, but set timeout to 100ms
      const longCommand = '"setTimeout(() => console.log(\'done\'), 5000)"';
      await expect(
        spawnWithTimeout('node', ['-e', longCommand], process.cwd(), 100)
      ).rejects.toThrow(TimeoutError);
    });

    test('resolves with code > 0 on failed command', async () => {
      const result = await spawnWithTimeout('node', ['-e', '"process.exit(2)"'], process.cwd(), 5000);
      expect(result.code).toBe(2);
    });
  });

});
