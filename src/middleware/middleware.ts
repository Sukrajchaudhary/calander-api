import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from '../config/config';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(`[${new Date().toISOString()}] [${logLevel}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
};

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      if (config.app.env === 'development') {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});
export const rateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: {
    success: false,
    error: {
      statusCode: 429,
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});
// Stricter rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitAuthMax,
  message: {
    success: false,
    error: {
      statusCode: 429,
      message: 'Too many authentication attempts, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// injection prevention

export const mongoSanitizeMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  // Helper function to sanitize an object
  const sanitize = (obj: any, path = ''): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map((item, index) => sanitize(item, `${path}[${index}]`));
    }
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // Check for MongoDB injection patterns
          if (key.includes('$') || key.includes('.')) {
            const sanitizedKey = key.replace(/\$/g, '_').replace(/\./g, '_');
            console.warn(`[SECURITY] Sanitized MongoDB injection attempt in ${req.path} at key: ${path}${key}`);
            sanitized[sanitizedKey] = sanitize(obj[key], `${path}${sanitizedKey}.`);
          } else {
            sanitized[key] = sanitize(obj[key], `${path}${key}.`);
          }
        }
      }
      return sanitized;
    }

    return obj;
  };

  // Sanitize req.body (this is mutable)
  if (req.body) {
    req.body = sanitize(req.body, 'body.');
  }

  // Sanitize req.params (this is mutable)
  if (req.params) {
    req.params = sanitize(req.params, 'params.');
  }

  // For req.query, we need a different approach since it's read-only in Express 5
  // We'll sanitize it and store in a safe location, or validate it without modifying
  if (req.query) {
    const sanitizedQuery = sanitize(req.query, 'query.');
    // Store sanitized query in req object for later use if needed
    (req as any).sanitizedQuery = sanitizedQuery;
  }

  next();
};

export const securityMiddleware = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};
