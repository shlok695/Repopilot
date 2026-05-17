import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  allowedOrigin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  maxZipSizeMb: parseInt(process.env.MAX_ZIP_SIZE_MB, 10) || 25,
  scanTimeoutMs: parseInt(process.env.SCAN_TIMEOUT_MS, 10) || 90000,
  agentTimeoutMs: parseInt(process.env.AGENT_TIMEOUT_MS, 10) || 30000,
  nodeEnv: process.env.NODE_ENV || 'development',
  tmpDir: process.env.TMP_DIR || '/tmp/repopilot',
  redactPatterns: process.env.REDACT_PATTERNS || '',
  maxScanHistory: parseInt(process.env.MAX_SCAN_HISTORY, 10) || 50
};

export function validateConfig() {
  logger.info('Config', 'Middleware Configuration Loaded', config);

  if (config.nodeEnv === 'production' && config.allowedOrigin === '*') {
    logger.warn('Config', 'ALLOWED_ORIGIN is wildcard * in production. This is a security risk!');
  }

  if (config.scanTimeoutMs < 10000) {
    logger.warn('Config', `SCAN_TIMEOUT_MS is ${config.scanTimeoutMs}ms, which is too short and may cause failures.`);
  }

  try {
    const reposDir = path.join(config.tmpDir, 'repos');
    if (!fs.existsSync(reposDir)) {
      fs.mkdirSync(reposDir, { recursive: true });
      logger.info('Config', `Created tmpDir subdirectories at ${reposDir}`);
    }
  } catch (error) {
    logger.error('Config', `Failed to create temporary directories in ${config.tmpDir}`, { error });
    throw new Error(`Configuration validation failed: unable to initialize tmpDir`);
  }
}

export default config;
