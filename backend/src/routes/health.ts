import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);
const router = Router();

const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';

// Check if a command is available
const checkCommand = async (command: string): Promise<boolean> => {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
};

// GET /api/health
router.get('/', async (req: Request, res: Response) => {
  try {
    const uptime = process.uptime();
    
    // Check availability of security tools
    const tools = {
      git: await checkCommand('git'),
      npm: await checkCommand('npm'),
      semgrep: await checkCommand('semgrep'),
      gitleaks: await checkCommand('gitleaks'),
      bandit: await checkCommand('bandit'),
      pipAudit: await checkCommand('pip-audit'),
    };

    // Check storage directories
    const storage = {
      tmpDir: existsSync(TMP_DIR),
      uploads: existsSync(join(TMP_DIR, 'uploads')),
      repos: existsSync(join(TMP_DIR, 'repos')),
      results: existsSync(join(TMP_DIR, 'results')),
      reports: existsSync(join(TMP_DIR, 'reports')),
    };

    const allStorageOk = Object.values(storage).every(v => v);
    const coreToolsOk = tools.git && tools.npm;

    res.json({
      status: coreToolsOk && allStorageOk ? 'healthy' : 'degraded',
      message: coreToolsOk && allStorageOk 
        ? 'All systems operational' 
        : 'Some features may be unavailable',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      tools,
      storage,
      warnings: [
        ...(!tools.semgrep ? ['Semgrep not available - will use fallback scanning'] : []),
        ...(!tools.gitleaks ? ['Gitleaks not available - will use fallback secret detection'] : []),
        ...(!tools.bandit ? ['Bandit not available - Python security scanning limited'] : []),
        ...(!tools.pipAudit ? ['pip-audit not available - Python dependency scanning limited'] : []),
      ],
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

// Made with Bob
