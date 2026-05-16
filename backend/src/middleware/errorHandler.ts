import { Request, Response, NextFunction } from 'express';

/**
 * Custom application error class
 * Used for operational errors with specific status codes
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handler middleware
 * Handles all errors and returns consistent JSON responses
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // AppError - Custom application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(isDevelopment && { stack: err.stack }),
    });
  }

  // Multer errors - File upload errors
  if (err.name === 'MulterError') {
    if (err.message === 'File too large') {
      return res.status(413).json({
        error: 'ZIP exceeds 25 MB limit',
        ...(isDevelopment && { stack: err.stack }),
      });
    }
    return res.status(400).json({
      error: `File upload error: ${err.message}`,
      ...(isDevelopment && { stack: err.stack }),
    });
  }

  // JSON SyntaxError - Invalid JSON in request body
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      ...(isDevelopment && { stack: err.stack }),
    });
  }

  // Unknown errors - Log and return generic message
  console.error('💥 Unexpected error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
};

// Made with Bob
