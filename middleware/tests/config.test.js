import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import { logger } from '../logger.js';
import config, { validateConfig } from '../config.js';

describe('Config Validation', () => {
  let loggerWarnSpy;
  let loggerInfoSpy;
  let loggerErrorSpy;

  beforeEach(() => {
    loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    loggerInfoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    
    // Reset config to safe defaults
    config.nodeEnv = 'development';
    config.allowedOrigin = 'http://localhost:3000';
    config.scanTimeoutMs = 90000;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('validateConfig logs a warning for wildcard ALLOWED_ORIGIN in production', () => {
    config.nodeEnv = 'production';
    config.allowedOrigin = '*';
    
    validateConfig();
    
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Config',
      'ALLOWED_ORIGIN is wildcard * in production. This is a security risk!'
    );
  });

  test('validateConfig logs a warning if scanTimeoutMs is too short', () => {
    config.scanTimeoutMs = 5000;
    
    validateConfig();
    
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Config',
      'SCAN_TIMEOUT_MS is 5000ms, which is too short and may cause failures.'
    );
  });

  test('validateConfig creates tmpDir subdirectories', () => {
    // Override tmpDir to a mock path
    const originalTmpDir = config.tmpDir;
    config.tmpDir = path.join(process.cwd(), 'mock_tmp');
    
    const reposDir = path.join(config.tmpDir, 'repos');
    
    // Ensure cleanup before test
    if (fs.existsSync(reposDir)) {
      fs.rmSync(reposDir, { recursive: true, force: true });
    }

    validateConfig();

    // Verify directory was created
    expect(fs.existsSync(reposDir)).toBe(true);
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'Config',
      `Created tmpDir subdirectories at ${reposDir}`
    );

    // Cleanup
    fs.rmSync(reposDir, { recursive: true, force: true });
    
    // Restore
    config.tmpDir = originalTmpDir;
  });

  test('validateConfig logs all config values', () => {
    validateConfig();
    expect(loggerInfoSpy).toHaveBeenCalledWith('Config', 'Middleware Configuration Loaded', config);
  });
});
