import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for scan endpoint
 * Limit: 5 scans per IP per minute
 * Returns 429 with Retry-After header when exceeded
 */
export const scanRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window
  message: { error: 'Too many scan requests from this IP, please try again later' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many scan requests from this IP, please try again later',
    });
  },
});

// Made with Bob