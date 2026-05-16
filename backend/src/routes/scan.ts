import { Router, Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { readFileSync, readdirSync, statSync } from 'fs';
import { uploadMiddleware } from '../middleware/upload.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateScanId } from '../utils/scanId.js';
import { cloneRepo } from '../utils/cloneRepo.js';
import { extractZip } from '../utils/extractZip.js';
import { saveScanResult, getScanResult, saveReport, getReportPath, listRecentScans } from '../utils/storage.js';

const router = Router();
const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';

// Mock function - will be replaced by actual scan orchestrator
const runFullScan = async (repoPath: string, scanId: string) => {
  // This is a placeholder - the actual implementation will call the middleware/scanOrchestrator.js
  return {
    scanId,
    status: 'completed',
    timestamp: new Date().toISOString(),
    repoMetadata: {
      name: 'example-repo',
      languages: ['JavaScript', 'TypeScript'],
      frameworks: ['React', 'Express'],
      hasDocker: true,
      hasTests: true,
      fileCount: 50,
      totalLines: 2500,
    },
    readme: {
      title: 'Example Repository',
      content: '# Example Repository\n\nThis is a placeholder README.',
    },
    vulnerabilities: [],
    bugs: [],
    suggestedFixes: [],
    warnings: [],
  };
};

// POST /api/scan - Start a new scan
router.post('/', uploadMiddleware.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, repoUrl } = req.body;
    const scanId = generateScanId();
    let repoPath: string;

    // Validate request
    if (!type || (type !== 'github' && type !== 'zip')) {
      throw new AppError('Invalid scan type. Must be "github" or "zip"', 400);
    }

    if (type === 'github') {
      if (!repoUrl) {
        throw new AppError('Repository URL is required for GitHub scans', 400);
      }
      if (!repoUrl.startsWith('https://github.com/')) {
        throw new AppError('Invalid GitHub URL. Must start with https://github.com/', 400);
      }

      console.log(`[${scanId}] Cloning repository: ${repoUrl}`);
      repoPath = await cloneRepo(repoUrl, scanId);
    } else {
      if (!req.file) {
        throw new AppError('ZIP file is required for ZIP scans', 400);
      }

      console.log(`[${scanId}] Extracting ZIP file: ${req.file.originalname}`);
      repoPath = await extractZip(req.file.path, scanId);
    }

    console.log(`[${scanId}] Starting full scan...`);
    
    // Run the scan (this will call the middleware orchestrator)
    const scanResult = await runFullScan(repoPath, scanId);

    // Save results
    await saveScanResult(scanId, scanResult);
    
    // Generate and save report
    const reportMarkdown = `# RepoPilot Scan Report\n\nScan ID: ${scanId}\n\nPlaceholder report content.`;
    await saveReport(scanId, reportMarkdown);

    console.log(`[${scanId}] Scan completed successfully`);

    res.json(scanResult);
  } catch (error) {
    next(error);
  }
});

// GET /api/scan/:scanId - Get scan results
router.get('/:scanId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scanId } = req.params;

    if (!scanId || !scanId.startsWith('scan_')) {
      throw new AppError('Invalid scan ID', 400);
    }

    const result = await getScanResult(scanId);

    if (!result) {
      throw new AppError('Scan not found', 404);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/scan/:scanId/report - Download scan report
router.get('/:scanId/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scanId } = req.params;

    if (!scanId || !scanId.startsWith('scan_')) {
      throw new AppError('Invalid scan ID', 400);
    }

    const reportPath = getReportPath(scanId);
    
    if (!reportPath) {
      throw new AppError('Report not found', 404);
    }

    res.download(reportPath, `repopilot_${scanId}_report.md`, (err) => {
      if (err) {
        next(new AppError('Failed to download report', 500));
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/scans - List recent scans
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scans = await listRecentScans(10);
    res.json(scans);
  } catch (error) {
    next(error);
  }
});

export default router;

// Made with Bob
