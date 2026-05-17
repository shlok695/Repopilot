import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import healthRouter from './routes/health.js';
import scanRouter from './routes/scan.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { autoCleanup } from './utils/storage.js';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { sanitizeBody } from './middleware/sanitize.js';

// Load environment variables
config();

// Process-level error handlers
process.on('uncaughtException', (error: Error) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...');
  console.error('Rejection reason:', reason);
  if (reason instanceof Error) {
    console.error('Stack trace:', reason.stack);
  }
  process.exit(1);
});

const app = express();
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';

app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
app.use(requestId); // Add X-Request-ID to all responses

// CORS - Allow only GET and POST methods
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST'],
}));

// Logging
const isDev = process.env.NODE_ENV !== 'production';
if (isDev) {
  app.use(morgan('dev'));
}
app.use(requestLogger); // Custom logger with request ID and timing

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request sanitization
app.use(sanitizeBody);

// Create necessary directories
const createDirectories = () => {
  const dirs = [
    TMP_DIR,
    join(TMP_DIR, 'uploads'),
    join(TMP_DIR, 'repos'),
    join(TMP_DIR, 'results'),
    join(TMP_DIR, 'reports'),
  ];

  dirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
};

// Validate configuration
const validateConfig = () => {
  console.log('\n=== RepoPilot Backend Configuration ===');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`PORT: ${PORT}`);
  console.log(`ALLOWED_ORIGIN: ${ALLOWED_ORIGIN}`);
  console.log(`TMP_DIR: ${TMP_DIR}`);
  console.log(`MAX_ZIP_SIZE_MB: ${process.env.MAX_ZIP_SIZE_MB || 25}`);
  console.log(`SCAN_TIMEOUT_MS: ${process.env.SCAN_TIMEOUT_MS || 90000}`);
  console.log(`AGENT_TIMEOUT_MS: ${process.env.AGENT_TIMEOUT_MS || 30000}`);
  console.log('=====================================\n');
};

// Routes
app.use('/api/health', healthRouter);
app.use('/api/scan', scanRouter);
app.use('/api/scans', scanRouter);

// Standalone metrics endpoint (also available at /api/health/metrics)
import { getMetrics } from './utils/metrics.js';
app.get('/api/metrics', (_req, res) => {
  res.json(getMetrics());
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize and start server
const startServer = async () => {
  try {
    validateConfig();
    createDirectories();

    app.listen(PORT, () => {
      console.log(`🚀 RepoPilot Backend running on port ${PORT}`);
      console.log(`📡 CORS enabled for: ${ALLOWED_ORIGIN}`);
      console.log(`💾 Storage directory: ${TMP_DIR}`);
      console.log(`\n✅ Server is ready to accept requests\n`);
      
      // Run cleanup every hour
      setInterval(async () => {
        console.log('[Server] Running auto-cleanup of old scans...');
        try {
          await autoCleanup();
          console.log('[Server] Auto-cleanup completed successfully');
        } catch (error) {
          console.error('[Server] Auto-cleanup failed:', error);
        }
      }, 60 * 60 * 1000); // 1 hour in milliseconds
      
      console.log('🧹 Auto-cleanup scheduled to run every hour');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

// Made with Bob
