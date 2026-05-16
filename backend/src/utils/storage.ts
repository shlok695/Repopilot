import { writeFile, readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';

export const saveScanResult = async (scanId: string, result: any): Promise<void> => {
  const resultPath = join(TMP_DIR, 'results', `${scanId}.json`);
  await writeFile(resultPath, JSON.stringify(result, null, 2), 'utf-8');
};

export const getScanResult = async (scanId: string): Promise<any | null> => {
  const resultPath = join(TMP_DIR, 'results', `${scanId}.json`);
  
  if (!existsSync(resultPath)) {
    return null;
  }

  const data = await readFile(resultPath, 'utf-8');
  return JSON.parse(data);
};

export const saveReport = async (scanId: string, markdown: string): Promise<void> => {
  const reportPath = join(TMP_DIR, 'reports', `${scanId}.md`);
  await writeFile(reportPath, markdown, 'utf-8');
};

export const getReportPath = (scanId: string): string | null => {
  const reportPath = join(TMP_DIR, 'reports', `${scanId}.md`);
  
  if (!existsSync(reportPath)) {
    return null;
  }

  return reportPath;
};

export const listRecentScans = async (limit: number = 10): Promise<any[]> => {
  const resultsDir = join(TMP_DIR, 'results');
  
  if (!existsSync(resultsDir)) {
    return [];
  }

  try {
    const files = await readdir(resultsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // Get file stats and sort by modification time
    const fileStats = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = join(resultsDir, file);
        const stats = await stat(filePath);
        return { file, mtime: stats.mtime };
      })
    );

    fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Read and return the most recent scans
    const recentScans = await Promise.all(
      fileStats.slice(0, limit).map(async ({ file }) => {
        const data = await readFile(join(resultsDir, file), 'utf-8');
        const result = JSON.parse(data);
        return {
          scanId: result.scanId,
          repoName: result.repoMetadata?.name || 'Unknown',
          timestamp: result.timestamp,
          status: result.status,
          vulnerabilityCount: result.vulnerabilities?.length || 0,
          bugCount: result.bugs?.length || 0,
        };
      })
    );

    return recentScans;
  } catch (error) {
    console.error('Error listing recent scans:', error);
    return [];
  }
};

export const cleanupScanFolder = async (scanId: string): Promise<void> => {
  // This would implement cleanup logic for old scans
  // For now, it's a placeholder
  console.log(`Cleanup requested for scan: ${scanId}`);
};

// Made with Bob
