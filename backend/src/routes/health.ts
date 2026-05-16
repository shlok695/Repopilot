import { Router, Request, Response, NextFunction } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { getMetrics } from '../utils/metrics.js';
import { AppError } from '../middleware/errorHandler.js';
import { checkTools, getDiskSpace, countActiveScans } from '../utils/toolDetection.js';

const router = Router();

const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';

// GET /api/health - Comprehensive health check with tool diagnostics
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const uptime = process.uptime();
    
    // Check all tools with caching
    const toolNames = ['git', 'npm', 'semgrep', 'gitleaks', 'bandit', 'pip-audit'];
    const toolResults = await checkTools(toolNames);
    
    // Format tools response
    const tools = {
      git: {
        available: toolResults.git.available,
        version: toolResults.git.version,
      },
      npm: {
        available: toolResults.npm.available,
        version: toolResults.npm.version,
      },
      semgrep: {
        available: toolResults.semgrep.available,
        version: toolResults.semgrep.version,
      },
      gitleaks: {
        available: toolResults.gitleaks.available,
        version: toolResults.gitleaks.version,
      },
      bandit: {
        available: toolResults.bandit.available,
        version: toolResults.bandit.version,
      },
      pipAudit: {
        available: toolResults['pip-audit'].available,
        version: toolResults['pip-audit'].version,
      },
    };

    // Check storage directories
    const reposDir = join(TMP_DIR, 'repos');
    const resultsDir = join(TMP_DIR, 'results');
    const reportsDir = join(TMP_DIR, 'reports');
    const uploadsDir = join(TMP_DIR, 'uploads');
    
    const storage = {
      tmpDir: TMP_DIR,
      resultsDir: existsSync(resultsDir),
      reportsDir: existsSync(reportsDir),
      reposDir: existsSync(reposDir),
      uploadsDir: existsSync(uploadsDir),
      writable: existsSync(TMP_DIR),
    };

    // Get disk space
    const diskFreeGB = await getDiskSpace('/tmp');
    if (diskFreeGB !== null) {
      (storage as any).diskFreeGB = diskFreeGB;
    }

    // Count active scans
    const activeScans = await countActiveScans(reposDir);

    // Determine health status
    const coreToolsOk = tools.git.available && tools.npm.available;
    const allStorageOk = storage.resultsDir && storage.reportsDir && storage.writable;
    
    let status: string;
    let message: string;
    let httpStatus = 200;
    
    if (!coreToolsOk) {
      status = 'unhealthy';
      message = 'Critical tools missing (git or npm)';
      httpStatus = 503;
    } else if (!allStorageOk) {
      status = 'degraded';
      message = 'Storage issues detected';
    } else if (!tools.semgrep.available || !tools.gitleaks.available) {
      status = 'degraded';
      message = 'Some features may be unavailable';
    } else {
      status = 'healthy';
      message = 'All systems operational';
    }

    // Build warnings array
    const warnings: string[] = [];
    if (!tools.git.available) warnings.push('Git not available - repository cloning disabled');
    if (!tools.npm.available) warnings.push('npm not available - dependency scanning disabled');
    if (!tools.semgrep.available) warnings.push('Semgrep not available - will use fallback scanning');
    if (!tools.gitleaks.available) warnings.push('Gitleaks not available - will use fallback secret detection');
    if (!tools.bandit.available) warnings.push('Bandit not available - Python security scanning limited');
    if (!tools.pipAudit.available) warnings.push('pip-audit not available - Python dependency scanning limited');

    const response = {
      status,
      message,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      tools,
      storage,
      activeScans,
      warnings,
    };

    res.status(httpStatus).json(response);
  } catch (error) {
    next(new AppError('Health check failed', 500));
  }
});

// GET /api/metrics
router.get('/metrics', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = getMetrics();
    res.json(metrics);
  } catch (error) {
    next(new AppError('Failed to retrieve metrics', 500));
  }
});

export default router;

// Made with Bob
