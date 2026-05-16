import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestId } from '../middleware/requestId';
import { sanitizeBody } from '../middleware/sanitize';
import { scanRateLimiter } from '../middleware/rateLimiter';
import { errorHandler } from '../middleware/errorHandler';
import { getMetrics, resetMetrics } from '../utils/metrics';

describe('Security Middleware Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    resetMetrics();
  });

  describe('Helmet Security Headers', () => {
    beforeEach(() => {
      app.use(helmet());
      app.get('/test', (_req, res) => res.json({ ok: true }));
    });

    it('should set X-Frame-Options header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-DNS-Prefetch-Control header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });
  });

  describe('Request ID Middleware', () => {
    beforeEach(() => {
      app.use(requestId);
      app.get('/test', (_req, res) => res.json({ ok: true }));
    });

    it('should add X-Request-ID header to response', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-request-id']).toBeDefined();
      expect(typeof response.headers['x-request-id']).toBe('string');
    });

    it('should generate unique request IDs', async () => {
      const response1 = await request(app).get('/test');
      const response2 = await request(app).get('/test');
      
      expect(response1.headers['x-request-id']).not.toBe(response2.headers['x-request-id']);
    });

    it('should generate valid UUID format', async () => {
      const response = await request(app).get('/test');
      const requestId = response.headers['x-request-id'];
      
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(requestId).toMatch(uuidRegex);
    });
  });

  describe('Request Sanitization Middleware', () => {
    beforeEach(() => {
      app.use(express.json());
      app.use(sanitizeBody);
      app.post('/test', (req, res) => res.json(req.body));
      app.use(errorHandler);
    });

    it('should trim whitespace from strings', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: '  John Doe  ', email: ' test@example.com ' });
      
      expect(response.body.name).toBe('John Doe');
      expect(response.body.email).toBe('test@example.com');
    });

    it('should reject null bytes in strings', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: 'John\0Doe' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Request contains invalid null byte characters');
    });

    it('should sanitize nested objects', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          user: {
            name: '  Alice  ',
            profile: {
              bio: '  Developer  '
            }
          }
        });
      
      expect(response.body.user.name).toBe('Alice');
      expect(response.body.user.profile.bio).toBe('Developer');
    });

    it('should handle arrays of strings', async () => {
      const response = await request(app)
        .post('/test')
        .send({ tags: ['  tag1  ', '  tag2  '] });
      
      expect(response.body.tags[0]).toBe('tag1');
      expect(response.body.tags[1]).toBe('tag2');
    });

    it('should not modify non-string values', async () => {
      const response = await request(app)
        .post('/test')
        .send({ count: 42, active: true, data: null });
      
      expect(response.body.count).toBe(42);
      expect(response.body.active).toBe(true);
      expect(response.body.data).toBe(null);
    });
  });

  describe('Rate Limiter Middleware', () => {
    beforeEach(() => {
      app.use(express.json());
      app.post('/scan', scanRateLimiter, (_req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow first 5 requests', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app).post('/scan').send({});
        expect(response.status).toBe(200);
      }
    });

    it('should block 6th request with 429', async () => {
      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await request(app).post('/scan').send({});
      }
      
      // 6th request should be rate limited
      const response = await request(app).post('/scan').send({});
      expect(response.status).toBe(429);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('Too many');
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).post('/scan').send({});
      
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('should reset after time window', async () => {
      const now = Date.now();
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await request(app).post('/scan').send({});
      }
      
      dateNowSpy.mockReturnValue(now + 61000);
      
      // Should allow requests again
      const response = await request(app).post('/scan').send({});
      expect(response.status).toBe(200);
    });
  });

  describe('CORS Configuration', () => {
    beforeEach(() => {
      app.use(cors({
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      }));
      app.get('/test', (_req, res) => res.json({ ok: true }));
      app.post('/test', (_req, res) => res.json({ ok: true }));
      app.put('/test', (_req, res) => res.json({ ok: true }));
    });

    it('should allow GET requests', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should allow POST requests', async () => {
      const response = await request(app)
        .post('/test')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.status).toBe(200);
    });

    it('should handle preflight for allowed methods', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');
      
      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return metrics object', () => {
      const metrics = getMetrics();
      
      expect(metrics).toHaveProperty('totalScans');
      expect(metrics).toHaveProperty('activeScans');
      expect(metrics).toHaveProperty('uptime');
      expect(typeof metrics.totalScans).toBe('number');
      expect(typeof metrics.activeScans).toBe('number');
      expect(typeof metrics.uptime).toBe('number');
    });

    it('should track uptime in seconds', () => {
      const metrics = getMetrics();
      
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should initialize with zero scans', () => {
      resetMetrics();
      const metrics = getMetrics();
      
      expect(metrics.totalScans).toBe(0);
      expect(metrics.activeScans).toBe(0);
    });
  });
});

// Made with Bob
