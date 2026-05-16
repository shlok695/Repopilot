import { spawn } from 'child_process';

export const withTimeout = (promise, timeoutMs, label = 'Operation') => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

export const spawnWithTimeout = (command, args = [], cwd = process.cwd(), timeoutMs = 30000) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`));
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (!timedOut) {
        resolve({ stdout, stderr, code });
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      if (!timedOut) {
        reject(error);
      }
    });
  });
};

export const withRetry = async (fn, retries = 3, delayMs = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

// Made with Bob
