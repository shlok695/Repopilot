import { spawn } from 'child_process';
import { logger } from './logger.js';
import { config } from './config.js';

// Custom Error class to identify timeouts easily
export class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Race a promise against a timeout.
 * If the promise resolves/rejects before ms, returns that result.
 * If ms elapses first, rejects with a TimeoutError.
 *
 * @param {Promise} promise 
 * @param {number} ms 
 * @param {string} label 
 * @returns {Promise<any>}
 */
export async function withTimeout(promise, ms, label = 'Operation') {
  const timeoutMs = config.agentTimeoutMs || ms;

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      logger.warn('timeoutManager', `${label} timed out after ${timeoutMs}ms`);
      reject(new TimeoutError(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retry a function (which returns a Promise) up to `retries` times
 * if it fails.
 *
 * @param {Function} fn 
 * @param {number} retries 
 * @param {number} delayMs 
 * @returns {Promise<any>}
 */
export async function withRetry(fn, retries = 1, delayMs = 2000) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }
      logger.warn('timeoutManager', `Function failed, retrying (${attempt}/${retries}) in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Spawn a child process with a strict timeout.
 * Rejects and kills the child if timeoutMs is exceeded.
 *
 * @param {string} command 
 * @param {string[]} args 
 * @param {string} cwd 
 * @param {number} timeoutMs 
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export function spawnWithTimeout(command, args, cwd, timeoutMs) {
  return new Promise((resolve, reject) => {
    // If not provided, fallback to environment var or 30s
    const ms = timeoutMs || (process.env.AGENT_TIMEOUT_MS ? parseInt(process.env.AGENT_TIMEOUT_MS, 10) : 30000);
    
    let stdout = '';
    let stderr = '';
    let isFinished = false;

    // Use shell for complex commands if needed, but array of args is preferred
    const child = spawn(command, args, { cwd, shell: true });

    const timeoutId = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        child.kill('SIGKILL');
        logger.warn('timeoutManager', `Process ${command} timed out after ${ms}ms in ${cwd}`);
        reject(new TimeoutError(`Command ${command} timed out after ${ms}ms`));
      }
    }, ms);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeoutId);
        reject(error);
      }
    });

    child.on('close', (code) => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeoutId);
        resolve({ stdout, stderr, code });
      }
    });
  });
}
