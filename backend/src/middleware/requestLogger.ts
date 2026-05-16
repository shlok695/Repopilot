import { Request, Response, NextFunction } from 'express';

/**
 * Custom request logger with timing and request ID
 * Logs: method, path, IP, request ID, duration in milliseconds
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = (req as any).requestId || 'unknown';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, path } = req;
    const { statusCode } = res;
    
    console.log(
      `[${new Date().toISOString()}] ${method} ${path} - ` +
      `IP: ${ip} - Status: ${statusCode} - ` +
      `Duration: ${duration}ms - RequestID: ${requestId}`
    );
  });
  
  next();
};

// Made with Bob