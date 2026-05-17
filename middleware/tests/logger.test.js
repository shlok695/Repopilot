import { jest } from '@jest/globals';
import { logger, getLogs, LOG_BUFFER_SIZE, getLogsHandler } from '../logger.js';

describe('Logger', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Reset process.env before each test
    process.env.NODE_ENV = 'development';

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Clear buffer (by repeatedly triggering buffer flush if we could, but let's just ignore old state in tests or do a specific test)
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('logger.info writes to console.log', () => {
    logger.info('TestContext', 'Info message', { scanId: '123', durationMs: 45 });
    
    expect(consoleLogSpy).toHaveBeenCalled();
    const logOutput = consoleLogSpy.mock.calls[0][0];
    expect(logOutput).toContain('[INFO]');
    expect(logOutput).toContain('[TestContext]');
    expect(logOutput).toContain('[123]');
    expect(logOutput).toContain('Info message');
    expect(logOutput).toContain('(45ms)');
  });

  test('logger.warn writes to console.warn', () => {
    logger.warn('TestContext', 'Warning message', { ip: '127.0.0.1' });
    
    expect(consoleWarnSpy).toHaveBeenCalled();
    const logOutput = consoleWarnSpy.mock.calls[0][0];
    expect(logOutput).toContain('[WARN]');
    expect(logOutput).toContain('Warning message');
    expect(logOutput).toContain('(IP: 127.0.0.1)');
  });

  test('logger.error writes to console.error', () => {
    const error = new Error('Test error');
    logger.error('TestContext', 'Error message', { error });
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    const logOutput = consoleErrorSpy.mock.calls[0][0];
    expect(logOutput).toContain('[ERROR]');
    expect(logOutput).toContain('Error message: Test error');
  });

  test('JSON format in production', () => {
    process.env.NODE_ENV = 'production';
    logger.info('ProdContext', 'Prod message', { scanId: 'prod-123', durationMs: 100 });
    
    expect(consoleLogSpy).toHaveBeenCalled();
    const logOutput = consoleLogSpy.mock.calls[0][0];
    
    // Parse the JSON
    const parsed = JSON.parse(logOutput);
    expect(parsed.level).toBe('INFO');
    expect(parsed.context).toBe('ProdContext');
    expect(parsed.message).toBe('Prod message');
    expect(parsed.scanId).toBe('prod-123');
    expect(parsed.durationMs).toBe(100);
    expect(parsed.timestamp).toBeDefined();
  });

  test('maintains ring buffer of correct size', () => {
    // Write 60 logs
    for (let i = 0; i < 60; i++) {
      logger.info('BufferTest', `Message ${i}`);
    }
    
    const logs = getLogs();
    expect(logs).toHaveLength(LOG_BUFFER_SIZE); // Should be 50
    // The last log should be "Message 59"
    expect(logs[logs.length - 1].message).toBe('Message 59');
    // The first log should be "Message 10" (since 0-9 were shifted out)
    expect(logs[0].message).toBe('Message 10');
  });

  test('getLogsHandler responds with JSON array', () => {
    const mockRes = {
      json: jest.fn()
    };
    getLogsHandler({}, mockRes);
    expect(mockRes.json).toHaveBeenCalled();
    const result = mockRes.json.mock.calls[0][0];
    expect(Array.isArray(result)).toBe(true);
  });
});
