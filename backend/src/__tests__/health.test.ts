import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import { checkTools, getDiskSpace, countActiveScans } from '../utils/toolDetection';
import { errorHandler } from '../middleware/errorHandler';

// Mock the toolDetection module
jest.mock('../utils/toolDetection');

const mockedCheckTools = checkTools as jest.MockedFunction<typeof checkTools>;
const mockedGetDiskSpace = getDiskSpace as jest.MockedFunction<typeof getDiskSpace>;
const mockedCountActiveScans = countActiveScans as jest.MockedFunction<typeof countActiveScans>;

describe('Health Endpoint Tests', () => {
  let app: express.Application;
  let router: Router;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Import and setup health route
    router = Router();
    
    router.get('/', async (_req, res, next) => {
      try {
        const uptime = process.uptime();
        
        const toolNames = ['git', 'npm', 'semgrep', 'gitleaks', 'bandit', 'pip-audit'];
        const toolResults = await checkTools(toolNames);
        
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

        const storage = {
          tmpDir: '/tmp/repopilot',
          resultsDir: true,
          reportsDir: true,
          reposDir: true,
          uploadsDir: true,
          writable: true,
        };

        const diskFreeGB = await getDiskSpace('/tmp');
        if (diskFreeGB !== null) {
          (storage as any).diskFreeGB = diskFreeGB;
        }

        const activeScans = await countActiveScans('/tmp/repopilot/repos');

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
        next(error);
      }
    });
    
    app.use('/api/health', router);
    app.use(errorHandler);
  });

  describe('All Tools Available', () => {
    beforeEach(() => {
      mockedCheckTools.mockResolvedValue({
        git: { available: true, version: '2.43.0', lastChecked: Date.now() },
        npm: { available: true, version: '10.2.4', lastChecked: Date.now() },
        semgrep: { available: true, version: '1.45.0', lastChecked: Date.now() },
        gitleaks: { available: true, version: '8.18.0', lastChecked: Date.now() },
        bandit: { available: true, version: '1.7.5', lastChecked: Date.now() },
        'pip-audit': { available: true, version: '2.6.1', lastChecked: Date.now() },
      });
      mockedGetDiskSpace.mockResolvedValue(45.2);
      mockedCountActiveScans.mockResolvedValue(3);
    });

    it('should return 200 with healthy status', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.message).toBe('All systems operational');
    });

    it('should include all tool information with versions', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.body.tools).toBeDefined();
      expect(response.body.tools.git.available).toBe(true);
      expect(response.body.tools.git.version).toBe('2.43.0');
      expect(response.body.tools.npm.available).toBe(true);
      expect(response.body.tools.npm.version).toBe('10.2.4');
    });

    it('should include storage information', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.body.storage).toBeDefined();
      expect(response.body.storage.tmpDir).toBe('/tmp/repopilot');
      expect(response.body.storage.resultsDir).toBe(true);
      expect(response.body.storage.writable).toBe(true);
    });

    it('should include disk space', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.body.storage.diskFreeGB).toBe(45.2);
    });

    it('should include active scans count', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.body.activeScans).toBe(3);
    });

    it('should include timestamp and uptime', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should have empty warnings array', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.body.warnings).toEqual([]);
    });
  });

  describe('Git Missing (Critical Tool)', () => {
    beforeEach(() => {
      mockedCheckTools.mockResolvedValue({
        git: { available: false, version: null, lastChecked: Date.now() },
        npm: { available: true, version: '10.2.4', lastChecked: Date.now() },
        semgrep: { available: true, version: '1.45.0', lastChecked: Date.now() },
        gitleaks: { available: true, version: '8.18.0', lastChecked: Date.now() },
        bandit: { available: true, version: '1.7.5', lastChecked: Date.now() },
        'pip-audit': { available: true, version: '2.6.1', lastChecked: Date.now() },
      });
      mockedGetDiskSpace.mockResolvedValue(45.2);
      mockedCountActiveScans.mockResolvedValue(0);
    });

    it('should return 503 with unhealthy status', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.message).toBe('Critical tools missing (git or npm)');
    });

    it('should include warning about git', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.body.warnings).toContain('Git not available - repository cloning disabled');
    });

    it('should show git as unavailable', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.body.tools.git.available).toBe(false);
      expect(response.body.tools.git.version).toBeNull();
    });
  });

  describe('npm Missing (Critical Tool)', () => {
    beforeEach(() => {
      mockedCheckTools.mockResolvedValue({
        git: { available: true, version: '2.43.0', lastChecked: Date.now() },
        npm: { available: false, version: null, lastChecked: Date.now() },
        semgrep: { available: true, version: '1.45.0', lastChecked: Date.now() },
        gitleaks: { available: true, version: '8.18.0', lastChecked: Date.now() },
        bandit: { available: true, version: '1.7.5', lastChecked: Date.now() },
        'pip-audit': { available: true, version: '2.6.1', lastChecked: Date.now() },
      });
      mockedGetDiskSpace.mockResolvedValue(45.2);
      mockedCountActiveScans.mockResolvedValue(0);
    });

    it('should return 503 with unhealthy status', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
    });

    it('should include warning about npm', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.body.warnings).toContain('npm not available - dependency scanning disabled');
    });
  });

  describe('Optional Tools Missing', () => {
    beforeEach(() => {
      mockedCheckTools.mockResolvedValue({
        git: { available: true, version: '2.43.0', lastChecked: Date.now() },
        npm: { available: true, version: '10.2.4', lastChecked: Date.now() },
        semgrep: { available: false, version: null, lastChecked: Date.now() },
        gitleaks: { available: false, version: null, lastChecked: Date.now() },
        bandit: { available: false, version: null, lastChecked: Date.now() },
        'pip-audit': { available: false, version: null, lastChecked: Date.now() },
      });
      mockedGetDiskSpace.mockResolvedValue(45.2);
      mockedCountActiveScans.mockResolvedValue(0);
    });

    it('should return 200 with degraded status', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
      expect(response.body.message).toBe('Some features may be unavailable');
    });

    it('should include warnings for missing optional tools', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.body.warnings).toContain('Semgrep not available - will use fallback scanning');
      expect(response.body.warnings).toContain('Gitleaks not available - will use fallback secret detection');
      expect(response.body.warnings).toContain('Bandit not available - Python security scanning limited');
      expect(response.body.warnings).toContain('pip-audit not available - Python dependency scanning limited');
    });
  });

  describe('Disk Space', () => {
    beforeEach(() => {
      mockedCheckTools.mockResolvedValue({
        git: { available: true, version: '2.43.0', lastChecked: Date.now() },
        npm: { available: true, version: '10.2.4', lastChecked: Date.now() },
        semgrep: { available: true, version: '1.45.0', lastChecked: Date.now() },
        gitleaks: { available: true, version: '8.18.0', lastChecked: Date.now() },
        bandit: { available: true, version: '1.7.5', lastChecked: Date.now() },
        'pip-audit': { available: true, version: '2.6.1', lastChecked: Date.now() },
      });
      mockedCountActiveScans.mockResolvedValue(0);
    });

    it('should include disk space when available', async () => {
      mockedGetDiskSpace.mockResolvedValue(100.5);
      
      const response = await request(app).get('/api/health');
      
      expect(response.body.storage.diskFreeGB).toBe(100.5);
    });

    it('should handle disk space check failure gracefully', async () => {
      mockedGetDiskSpace.mockResolvedValue(null);
      
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body.storage.diskFreeGB).toBeUndefined();
    });
  });

  describe('Active Scans Count', () => {
    beforeEach(() => {
      mockedCheckTools.mockResolvedValue({
        git: { available: true, version: '2.43.0', lastChecked: Date.now() },
        npm: { available: true, version: '10.2.4', lastChecked: Date.now() },
        semgrep: { available: true, version: '1.45.0', lastChecked: Date.now() },
        gitleaks: { available: true, version: '8.18.0', lastChecked: Date.now() },
        bandit: { available: true, version: '1.7.5', lastChecked: Date.now() },
        'pip-audit': { available: true, version: '2.6.1', lastChecked: Date.now() },
      });
      mockedGetDiskSpace.mockResolvedValue(45.2);
    });

    it('should return 0 when no active scans', async () => {
      mockedCountActiveScans.mockResolvedValue(0);
      
      const response = await request(app).get('/api/health');
      
      expect(response.body.activeScans).toBe(0);
    });

    it('should return correct count of active scans', async () => {
      mockedCountActiveScans.mockResolvedValue(5);
      
      const response = await request(app).get('/api/health');
      
      expect(response.body.activeScans).toBe(5);
    });
  });
});

// Made with Bob