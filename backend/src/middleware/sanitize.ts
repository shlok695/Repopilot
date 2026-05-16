import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

/**
 * Sanitize request body strings
 * - Trim whitespace
 * - Reject null bytes
 */
export const sanitizeBody = (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid request data', 400));
  }
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj: any): void => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Check for null bytes
        if (value.includes('\0')) {
          throw new AppError('Request contains invalid null byte characters', 400);
        }
        // Trim whitespace
        obj[key] = value.trim();
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitizeObject(value);
      }
    }
  }
};

// Made with Bob
