import { writeFile, readFile, readdir, stat, mkdir, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';

// Custom Error Classes
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

// Helper function to ensure directory exists
const ensureDirectory = async (dirPath: string): Promise<void> => {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
    if ((error as any).code !== 'EEXIST') {
      throw error;
    }
  }
};

// Save scan result to JSON file
export const saveScanResult = async (scanId: string, result: any): Promise<void> => {
  try {
    const resultsDir = join(TMP_DIR, 'results');
    await ensureDirectory(resultsDir);
    
    // Add createdAt timestamp if not present
    const resultWithTimestamp = {
      ...result,
      createdAt: result.createdAt || Date.now(),
    };
    
    const resultPath = join(resultsDir, `${scanId}.json`);
    await writeFile(resultPath, JSON.stringify(resultWithTimestamp, null, 2), 'utf-8');
  } catch (error) {
    throw new StorageError(`Failed to save scan result: ${(error as Error).message}`);
  }
};

// Get scan result from JSON file
export const getScanResult = async (scanId: string): Promise<any> => {
  const resultPath = join(TMP_DIR, 'results', `${scanId}.json`);
  
  if (!existsSync(resultPath)) {
    throw new NotFoundError(`Scan result not found: ${scanId}`);
  }

  try {
    const data = await readFile(resultPath, 'utf-8');
    const result = JSON.parse(data);
    
    // Validate required fields
    if (!result.scanId || !result.status) {
      throw new StorageError('Invalid scan result: missing required fields (scanId, status)');
    }
    
    return result;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(`Failed to read scan result: ${(error as Error).message}`);
  }
};

// Save report markdown file
export const saveReport = async (scanId: string, markdown: string): Promise<void> => {
  try {
    const reportsDir = join(TMP_DIR, 'reports');
    await ensureDirectory(reportsDir);
    
    const reportPath = join(reportsDir, `${scanId}.md`);
    await writeFile(reportPath, markdown, 'utf-8');
  } catch (error) {
    throw new StorageError(`Failed to save report: ${(error as Error).message}`);
  }
};

// Get report file path
export const getReportPath = (scanId: string): string => {
  const reportPath = join(TMP_DIR, 'reports', `${scanId}.md`);
  
  if (!existsSync(reportPath)) {
    throw new NotFoundError(`Report not found: ${scanId}`);
  }

  return reportPath;
};

// Scan summary interface
export interface ScanSummary {
  scanId: string;
  repoName: string;
  status: string;
  createdAt: number;
}

// List recent scans (returns scan summaries)
export const listRecentScans = async (limit: number = 10): Promise<ScanSummary[]> => {
  const resultsDir = join(TMP_DIR, 'results');
  
  if (!existsSync(resultsDir)) {
    return [];
  }

  try {
    const files = await readdir(resultsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // Read and parse each file
    const scans = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const filePath = join(resultsDir, file);
          const content = await readFile(filePath, 'utf-8');
          const result = JSON.parse(content);
          
          // Extract repo name from repoMetadata or repoUrl
          let repoName = 'Unknown';
          if (result.repoMetadata?.name) {
            repoName = result.repoMetadata.name;
          } else if (result.repoUrl) {
            // Extract repo name from URL (e.g., https://github.com/user/repo -> repo)
            const match = result.repoUrl.match(/\/([^\/]+)(?:\.git)?$/);
            if (match) {
              repoName = match[1].replace('.git', '');
            }
          }
          
          return {
            scanId: result.scanId || file.replace('.json', ''),
            repoName,
            status: result.status || 'unknown',
            createdAt: result.createdAt || 0,
          };
        } catch (error) {
          console.warn(`Failed to parse scan file ${file}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and sort by createdAt descending
    const validScans = scans.filter((scan): scan is ScanSummary => scan !== null);
    validScans.sort((a, b) => b.createdAt - a.createdAt);

    return validScans.slice(0, limit);
  } catch (error) {
    console.error('Error listing recent scans:', error);
    return [];
  }
};

// Delete a scan (remove all associated files)
export const deleteScan = async (scanId: string): Promise<void> => {
  const repoPath = join(TMP_DIR, 'repos', scanId);
  const resultPath = join(TMP_DIR, 'results', `${scanId}.json`);
  const reportPath = join(TMP_DIR, 'reports', `${scanId}.md`);
  
  // Check if scan exists
  if (!existsSync(resultPath)) {
    throw new NotFoundError(`Scan not found: ${scanId}`);
  }
  
  try {
    // Delete repo folder
    if (existsSync(repoPath)) {
      await rm(repoPath, { recursive: true, force: true });
    }
    
    // Delete result file
    if (existsSync(resultPath)) {
      await unlink(resultPath);
    }
    
    // Delete report file
    if (existsSync(reportPath)) {
      await unlink(reportPath);
    }
    
    console.log(`[${scanId}] Scan deleted successfully`);
  } catch (error) {
    throw new StorageError(`Failed to delete scan: ${(error as Error).message}`);
  }
};

// Cleanup scan folder (delete repo, result, and report)
export const cleanupScanFolder = async (scanId: string): Promise<void> => {
  console.log(`[${scanId}] Starting cleanup...`);
  
  const repoPath = join(TMP_DIR, 'repos', scanId);
  const resultPath = join(TMP_DIR, 'results', `${scanId}.json`);
  const reportPath = join(TMP_DIR, 'reports', `${scanId}.md`);
  
  // Delete repo folder
  try {
    if (existsSync(repoPath)) {
      await rm(repoPath, { recursive: true, force: true });
      console.log(`[${scanId}] Deleted repo folder`);
    }
  } catch (error) {
    console.warn(`[${scanId}] Failed to delete repo folder:`, error);
  }
  
  // Delete result file
  try {
    if (existsSync(resultPath)) {
      await unlink(resultPath);
      console.log(`[${scanId}] Deleted result file`);
    }
  } catch (error) {
    console.warn(`[${scanId}] Failed to delete result file:`, error);
  }
  
  // Delete report file
  try {
    if (existsSync(reportPath)) {
      await unlink(reportPath);
      console.log(`[${scanId}] Deleted report file`);
    }
  } catch (error) {
    console.warn(`[${scanId}] Failed to delete report file:`, error);
  }
  
  console.log(`[${scanId}] Cleanup completed`);
};

// Auto-cleanup: remove scans older than 2 hours
export const autoCleanup = async (): Promise<void> => {
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const now = Date.now();
  
  const reposDir = join(TMP_DIR, 'repos');
  
  if (!existsSync(reposDir)) {
    return;
  }

  try {
    const folders = await readdir(reposDir);
    
    for (const folder of folders) {
      const folderPath = join(reposDir, folder);
      
      try {
        const stats = await stat(folderPath);
        
        // Check if folder is older than 2 hours
        if (now - stats.mtime.getTime() > TWO_HOURS_MS) {
          console.log(`[AutoCleanup] Removing old scan: ${folder}`);
          await cleanupScanFolder(folder);
        }
      } catch (error) {
        console.warn(`[AutoCleanup] Failed to check folder ${folder}:`, error);
      }
    }
  } catch (error) {
    console.error('[AutoCleanup] Error during cleanup:', error);
  }
};

// Made with Bob
