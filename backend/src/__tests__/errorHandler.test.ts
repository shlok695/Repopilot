import request from 'supertest';
import express from 'express';
import { AppError, errorHandler, notFoundHandler } from '../middleware/errorHandler';

describe('Error Handler Middleware Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('AppError Handling', () => {
    beforeEach(() => {
      app.get('/test-400', (_req, _res, next) => {
        next(new AppError('Bad request error', 400));
      });
      app.get('/test-404', (_req, _res, next) => {
        next(new AppError('Resource not found', 404));
      });
      app.get('/test-500', (_req, _res, next) => {
        next(new AppError('Internal server error', 500));
      });
      app.use(errorHandler);
    });

    it('should return 400 with error message for AppError(400)', async () => {
      const response = await request(app).get('/test-400');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Bad request error');
    });

    it('should return 404 with error message for AppError(404)', async () => {
      const response = await request(app).get('/test-404');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Resource not found');
    });

    it('should return 500 with error message for AppError(500)', async () => {
      const response = await request(app).get('/test-500');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Internal server error');
    });

    it('should include stack trace in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      const response = await request(app).get('/test-400');
      
      expect(response.body).toHaveProperty('stack');
      expect(typeof response.body.stack).toBe('string');
      
      delete process.env.NODE_ENV;
    });

    it('should not include stack trace in production mode', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await request(app).get('/test-400');
      
      expect(response.body).not.toHaveProperty('stack');
      
      delete process.env.NODE_ENV;
    });
  });

  describe('MulterError Handling', () => {
    beforeEach(() => {
      app.post('/test-file-too-large', (_req, _res, next) => {
        const error: any = new Error('File too large');
        error.name = 'MulterError';
        next(error);
      });
      
      app.post('/test-multer-generic', (_req, _res, next) => {
        const error: any = new Error('Unexpected field');
        error.name = 'MulterError';
        next(error);
      });
      
      app.use(errorHandler);
    });

    it('should return 413 for "File too large" MulterError', async () => {
      const response = await request(app).post('/test-file-too-large');
      
      expect(response.status).toBe(413);
      expect(response.body.error).toBe('ZIP file is too large. Please upload a file smaller than 100 MB.');
    });

    it('should return 400 for other MulterErrors', async () => {
      const response = await request(app).post('/test-multer-generic');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('File upload error');
      expect(response.body.error).toContain('Unexpected field');
    });

    it('should include stack trace in development mode for MulterError', async () => {
      process.env.NODE_ENV = 'development';
      
      const response = await request(app).post('/test-file-too-large');
      
      expect(response.body).toHaveProperty('stack');
      
      delete process.env.NODE_ENV;
    });
  });

  describe('JSON SyntaxError Handling', () => {
    beforeEach(() => {
      app.post('/test-json', (req, res) => {
        res.json({ received: req.body });
      });
      app.use(errorHandler);
    });

    it('should return 400 for invalid JSON', async () => {
      const response = await request(app)
        .post('/test-json')
        .set('Content-Type', 'application/json')
        .send('{invalid json}');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid JSON in request body');
    });

    it('should include stack trace in development mode for SyntaxError', async () => {
      process.env.NODE_ENV = 'development';
      
      const response = await request(app)
        .post('/test-json')
        .set('Content-Type', 'application/json')
        .send('{invalid}');
      
      expect(response.body).toHaveProperty('stack');
      
      delete process.env.NODE_ENV;
    });
  });

  describe('Unknown Error Handling', () => {
    beforeEach(() => {
      app.get('/test-unknown', (_req, _res, _next) => {
        throw new Error('Something went wrong');
      });
      app.use(errorHandler);
    });

    it('should return 500 for unknown errors', async () => {
      const response = await request(app).get('/test-unknown');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should include stack trace in development mode for unknown errors', async () => {
      process.env.NODE_ENV = 'development';
      
      const response = await request(app).get('/test-unknown');
      
      expect(response.body).toHaveProperty('stack');
      expect(typeof response.body.stack).toBe('string');
      
      delete process.env.NODE_ENV;
    });

    it('should not include stack trace in production mode for unknown errors', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await request(app).get('/test-unknown');
      
      expect(response.body).not.toHaveProperty('stack');
      
      delete process.env.NODE_ENV;
    });
  });

  describe('404 Not Found Handler', () => {
    beforeEach(() => {
      app.get('/existing-route', (_req, res) => {
        res.json({ ok: true });
      });
      app.use(notFoundHandler);
    });

    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Route GET /unknown-route not found');
    });

    it('should return 404 for unknown POST routes', async () => {
      const response = await request(app).post('/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Route POST /unknown-route not found');
    });

    it('should not affect existing routes', async () => {
      const response = await request(app).get('/existing-route');
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });

  describe('Error Response Format', () => {
    beforeEach(() => {
      app.get('/test', (_req, _res, next) => {
        next(new AppError('Test error', 400));
      });
      app.use(errorHandler);
    });

    it('should return consistent JSON format with error field', async () => {
      const response = await request(app).get('/test');
      
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should not include status field', async () => {
      const response = await request(app).get('/test');
      
      expect(response.body).not.toHaveProperty('status');
    });

    it('should not include message field', async () => {
      const response = await request(app).get('/test');
      
      expect(response.body).not.toHaveProperty('message');
    });
  });

  describe('AppError Class', () => {
    it('should create error with default status code 500', () => {
      const error = new AppError('Test error');
      
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Test error');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should create error with custom status code', () => {
      const error = new AppError('Not found', 404);
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error', 400);
      
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should be instance of Error', () => {
      const error = new AppError('Test error', 400);
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });
  });
});

// Made with Bob
