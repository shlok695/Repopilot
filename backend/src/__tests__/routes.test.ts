import request from 'supertest';
import express, { Express } from 'express';
import { jest } from '@jest/globals';
import healthRouter from '../routes/health.js';
import scanRouter from '../routes/scan.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

// Mock dependencies
jest.mock('../utils/cloneRepo.js', () => {
  const actual = jest.requireActual('../utils/cloneRepo.js') as typeof import('../utils/cloneRepo.js');
  return {
    ...actual,
    cloneRepo: jest.fn(),
  };
});
jest.mock('../utils/extractZip.js');
jest.mock('../utils/storage.js', () => {
  const actual = jest.requireActual('../utils/storage.js') as typeof import('../utils/storage.js');
  return {
    ...actual,
    saveScanResult: jest.fn(),
    getScanResult: jest.fn(),
    saveReport: jest.fn(),
    getReportPath: jest.fn(),
    cleanupScanFolder: jest.fn(),
  };
});
jest.mock('../middleware/rateLimiter.js', () => ({
  scanRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

import { cloneRepo, ValidationError } from '../utils/cloneRepo.js';
import { saveScanResult, getScanResult, saveReport, getReportPath, cleanupScanFolder, NotFoundError } from '../utils/storage.js';

const mockCloneRepo = cloneRepo as jest.MockedFunction<typeof cloneRepo>;
const mockSaveScanResult = saveScanResult as jest.MockedFunction<typeof saveScanResult>;
const mockGetScanResult = getScanResult as jest.MockedFunction<typeof getScanResult>;
const mockSaveReport = saveReport as jest.MockedFunction<typeof saveReport>;
const mockGetReportPath = getReportPath as jest.MockedFunction<typeof getReportPath>;
const mockCleanupScanFolder = cleanupScanFolder as jest.MockedFunction<typeof cleanupScanFolder>;

describe('RepoPilot Backend API Tests', () => {
  let app: Express;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/health', healthRouter);
    app.use('/api/scan', scanRouter);
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(['healthy', 'degraded', 'error']).toContain(response.body.status);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/scan', () => {
    it('should return 400 when type is missing', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({ repoUrl: 'https://github.com/test/repo' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Invalid scan type');
    });

    it('should return 400 when type is invalid', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({ type: 'invalid', repoUrl: 'https://github.com/test/repo' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Invalid scan type');
    });

    it('should return 400 when repoUrl is missing for github type', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({ type: 'github' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Repository URL is required');
    });

    it('should return 400 when GitHub URL is invalid', async () => {
      mockCloneRepo.mockRejectedValue(new ValidationError('Invalid GitHub URL'));

      const response = await request(app)
        .post('/api/scan')
        .send({ type: 'github', repoUrl: 'https://gitlab.com/test/repo' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Invalid GitHub URL');
    });

    it('should return 200 with scanId for valid GitHub scan', async () => {
      mockCloneRepo.mockResolvedValue('/tmp/repopilot/repos/scan_123');
      mockSaveScanResult.mockResolvedValue();
      mockSaveReport.mockResolvedValue();

      const response = await request(app)
        .post('/api/scan')
        .send({ type: 'github', repoUrl: 'https://github.com/expressjs/express' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('scanId');
      expect(response.body.scanId).toMatch(/^scan_\d+_[a-z0-9]+$/);
      expect(response.body).toHaveProperty('status');
      expect(mockCloneRepo).toHaveBeenCalledWith(
        'https://github.com/expressjs/express',
        expect.stringMatching(/^scan_\d+_[a-z0-9]+$/)
      );
    });

    it('should return 400 when ZIP file is missing', async () => {
      const response = await request(app)
        .post('/api/scan')
        .field('type', 'zip')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('ZIP file is required');
    });

    it('should return 413 when ZIP file exceeds size limit', async () => {
      // Create a buffer larger than 100MB
      const largeBuffer = Buffer.alloc(101 * 1024 * 1024);

      const response = await request(app)
        .post('/api/scan')
        .field('type', 'zip')
        .attach('file', largeBuffer, 'large.zip')
        .expect(413);

      expect(response.body.error).toBeDefined();
    });

    it('should call cleanup on scan error', async () => {
      mockCloneRepo.mockRejectedValue(new Error('Clone failed'));
      mockCleanupScanFolder.mockResolvedValue();

      await request(app)
        .post('/api/scan')
        .send({ type: 'github', repoUrl: 'https://github.com/test/repo' })
        .expect(500);

      expect(mockCleanupScanFolder).toHaveBeenCalled();
    });
  });

  describe('GET /api/scan/:scanId', () => {
    it('should return 400 for invalid scanId format', async () => {
      const response = await request(app)
        .get('/api/scan/invalid-id')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Invalid scan ID');
    });

    it('should return 404 for unknown scanId', async () => {
      mockGetScanResult.mockRejectedValue(new NotFoundError('Scan not found: scan_1234567890_abcd'));

      const response = await request(app)
        .get('/api/scan/scan_1234567890_abcd')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toContain('Scan not found');
    });

    it('should return scan result for valid scanId', async () => {
      const mockResult = {
        scanId: 'scan_1234567890_abcd',
        status: 'completed',
        timestamp: new Date().toISOString(),
        repoMetadata: { name: 'test-repo' },
        vulnerabilities: [],
        bugs: [],
      };

      mockGetScanResult.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/scan/scan_1234567890_abcd')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockGetScanResult).toHaveBeenCalledWith('scan_1234567890_abcd');
    });
  });

  describe('GET /api/scan/:scanId/report', () => {
    it('should return 400 for invalid scanId format', async () => {
      const response = await request(app)
        .get('/api/scan/invalid-id/report')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Invalid scan ID');
    });

    it('should return 404 for unknown scanId', async () => {
      mockGetReportPath.mockImplementation(() => {
        throw new NotFoundError('Report not found: scan_1234567890_abcd');
      });

      const response = await request(app)
        .get('/api/scan/scan_1234567890_abcd/report')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toContain('Report not found');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });
});

// Made with Bob
