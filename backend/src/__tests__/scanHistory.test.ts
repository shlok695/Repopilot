import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import { writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { listRecentScans, saveScanResult, deleteScan, ScanSummary } from '../utils/storage';
import { errorHandler } from '../middleware/errorHandler';

const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';
const TEST_RESULTS_DIR = join(TMP_DIR, 'results');
const TEST_REPORTS_DIR = join(TMP_DIR, 'reports');
const TEST_REPOS_DIR = join(TMP_DIR, 'repos');

describe('Scan History Tests', () => {
  let app: express.Application;
  let router: Router;

  beforeAll(async () => {
    // Create test directories
    await mkdir(TEST_RESULTS_DIR, { recursive: true });
    await mkdir(TEST_REPORTS_DIR, { recursive: true });
    await mkdir(TEST_REPOS_DIR, { recursive: true });
  });

  beforeEach(async () => {
    // Clean up test files before each test
    if (existsSync(TEST_RESULTS_DIR)) {
      const files = await require('fs/promises').readdir(TEST_RESULTS_DIR);
      for (const file of files) {
        await rm(join(TEST_RESULTS_DIR, file), { force: true });
      }
    }
    
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Import and setup routes
    router = Router();
    
    // GET /api/scans - List recent scans
    router.get('/', async (_req, res, next) => {
      try {
        const scans = await listRecentScans(10);
        res.json(scans);
      } catch (error) {
        next(error);
      }
    });
    
    // DELETE /api/scan/:scanId
    router.delete('/:scanId', async (req, res, next) => {
      try {
        const { scanId } = req.params;
        await deleteScan(scanId);
        return res.status(204).send();
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          return res.status(404).json({ error: error.message });
        }
        return next(error);
      }
    });
    
    app.use('/api/scans', router);
    app.use(errorHandler);
  });

  afterAll(async () => {
    // Clean up test directories
    try {
      if (existsSync(TEST_RESULTS_DIR)) {
        await rm(TEST_RESULTS_DIR, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('GET /api/scans', () => {
    it('should return empty array when no scans exist', async () => {
      const response = await request(app).get('/api/scans');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return array of scan summaries', async () => {
      // Create test scan
      const scanId = 'scan_test_001';
      const scanResult = {
        scanId,
        status: 'completed',
        repoUrl: 'https://github.com/user/test-repo',
        createdAt: Date.now(),
      };
      
      await saveScanResult(scanId, scanResult);
      
      const response = await request(app).get('/api/scans');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('scanId');
      expect(response.body[0]).toHaveProperty('repoName');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('createdAt');
    });

    it('should extract repo name from repoUrl', async () => {
      const scanId = 'scan_test_002';
      const scanResult = {
        scanId,
        status: 'completed',
        repoUrl: 'https://github.com/expressjs/express',
        createdAt: Date.now(),
      };
      
      await saveScanResult(scanId, scanResult);
      
      const response = await request(app).get('/api/scans');
      
      expect(response.body[0].repoName).toBe('express');
    });

    it('should use repoMetadata.name if available', async () => {
      const scanId = 'scan_test_003';
      const scanResult = {
        scanId,
        status: 'completed',
        repoUrl: 'https://github.com/user/repo',
        repoMetadata: {
          name: 'CustomRepoName',
        },
        createdAt: Date.now(),
      };
      
      await saveScanResult(scanId, scanResult);
      
      const response = await request(app).get('/api/scans');
      
      expect(response.body[0].repoName).toBe('CustomRepoName');
    });

    it('should return scans sorted by newest first', async () => {
      const now = Date.now();
      
      // Create scans with different timestamps
      await saveScanResult('scan_old', {
        scanId: 'scan_old',
        status: 'completed',
        repoUrl: 'https://github.com/user/old',
        createdAt: now - 10000,
      });
      
      await saveScanResult('scan_new', {
        scanId: 'scan_new',
        status: 'completed',
        repoUrl: 'https://github.com/user/new',
        createdAt: now,
      });
      
      await saveScanResult('scan_middle', {
        scanId: 'scan_middle',
        status: 'completed',
        repoUrl: 'https://github.com/user/middle',
        createdAt: now - 5000,
      });
      
      const response = await request(app).get('/api/scans');
      
      expect(response.body.length).toBe(3);
      expect(response.body[0].scanId).toBe('scan_new');
      expect(response.body[1].scanId).toBe('scan_middle');
      expect(response.body[2].scanId).toBe('scan_old');
    });

    it('should limit results to 10 scans', async () => {
      const now = Date.now();
      
      // Create 15 scans
      for (let i = 0; i < 15; i++) {
        await saveScanResult(`scan_${i}`, {
          scanId: `scan_${i}`,
          status: 'completed',
          repoUrl: `https://github.com/user/repo${i}`,
          createdAt: now + i,
        });
      }
      
      const response = await request(app).get('/api/scans');
      
      expect(response.body.length).toBe(10);
    });

    it('should handle scans with different statuses', async () => {
      await saveScanResult('scan_completed', {
        scanId: 'scan_completed',
        status: 'completed',
        repoUrl: 'https://github.com/user/repo1',
        createdAt: Date.now(),
      });
      
      await saveScanResult('scan_failed', {
        scanId: 'scan_failed',
        status: 'failed',
        repoUrl: 'https://github.com/user/repo2',
        createdAt: Date.now(),
      });
      
      const response = await request(app).get('/api/scans');
      
      expect(response.body.length).toBe(2);
      expect(response.body.find((s: ScanSummary) => s.scanId === 'scan_completed').status).toBe('completed');
      expect(response.body.find((s: ScanSummary) => s.scanId === 'scan_failed').status).toBe('failed');
    });
  });

  describe('DELETE /api/scan/:scanId', () => {
    it('should successfully delete a scan', async () => {
      const scanId = 'scan_to_delete';
      
      // Create scan
      await saveScanResult(scanId, {
        scanId,
        status: 'completed',
        repoUrl: 'https://github.com/user/repo',
        createdAt: Date.now(),
      });
      
      // Verify scan exists
      const resultPath = join(TEST_RESULTS_DIR, `${scanId}.json`);
      expect(existsSync(resultPath)).toBe(true);
      
      // Delete scan
      const response = await request(app).delete(`/api/scans/${scanId}`);
      
      expect(response.status).toBe(204);
      expect(existsSync(resultPath)).toBe(false);
    });

    it('should return 404 for non-existent scan', async () => {
      const response = await request(app).delete('/api/scans/non_existent_scan');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should delete all associated files', async () => {
      const scanId = 'scan_with_files';
      
      // Create scan result
      await saveScanResult(scanId, {
        scanId,
        status: 'completed',
        repoUrl: 'https://github.com/user/repo',
        createdAt: Date.now(),
      });
      
      // Create report file
      const reportPath = join(TEST_REPORTS_DIR, `${scanId}.md`);
      await writeFile(reportPath, '# Test Report', 'utf-8');
      
      // Create repo folder
      const repoPath = join(TEST_REPOS_DIR, scanId);
      await mkdir(repoPath, { recursive: true });
      await writeFile(join(repoPath, 'test.txt'), 'test', 'utf-8');
      
      // Verify files exist
      expect(existsSync(join(TEST_RESULTS_DIR, `${scanId}.json`))).toBe(true);
      expect(existsSync(reportPath)).toBe(true);
      expect(existsSync(repoPath)).toBe(true);
      
      // Delete scan
      await request(app).delete(`/api/scans/${scanId}`);
      
      // Verify all files deleted
      expect(existsSync(join(TEST_RESULTS_DIR, `${scanId}.json`))).toBe(false);
      expect(existsSync(reportPath)).toBe(false);
      expect(existsSync(repoPath)).toBe(false);
    });
  });

  describe('listRecentScans function', () => {
    it('should return empty array for empty directory', async () => {
      const scans = await listRecentScans(10);
      expect(scans).toEqual([]);
    });

    it('should handle invalid JSON files gracefully', async () => {
      // Create invalid JSON file
      const invalidPath = join(TEST_RESULTS_DIR, 'invalid.json');
      await writeFile(invalidPath, '{invalid json}', 'utf-8');
      
      // Create valid scan
      await saveScanResult('valid_scan', {
        scanId: 'valid_scan',
        status: 'completed',
        repoUrl: 'https://github.com/user/repo',
        createdAt: Date.now(),
      });
      
      const scans = await listRecentScans(10);
      
      // Should only return valid scan
      expect(scans.length).toBe(1);
      expect(scans[0].scanId).toBe('valid_scan');
    });

    it('should handle scans without createdAt field', async () => {
      // Create scan without createdAt
      const scanPath = join(TEST_RESULTS_DIR, 'scan_no_timestamp.json');
      await writeFile(scanPath, JSON.stringify({
        scanId: 'scan_no_timestamp',
        status: 'completed',
        repoUrl: 'https://github.com/user/repo',
      }), 'utf-8');
      
      const scans = await listRecentScans(10);
      
      expect(scans.length).toBe(1);
      expect(scans[0].createdAt).toBe(0);
    });
  });
});

// Made with Bob