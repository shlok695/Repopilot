import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import healthRouter from './routes/health.js';
import scanRouter from './routes/scan.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
const TMP_DIR = process.env.TMP_DIR || '/tmp/repopilot';

// Middleware
app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

// Made with Bob
