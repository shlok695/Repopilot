import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Add X-Request-ID header to all responses
 * Generates a unique UUID for each request for tracing
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID();
  
  // Store in request for logging
  (req as any).requestId = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

// Made with Bob