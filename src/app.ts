import express, { Express } from 'express';
import config from './config/config';
import {
  requestLogger,
  corsMiddleware,
  securityMiddleware,
  helmetMiddleware,
  mongoSanitizeMiddleware,
  rateLimiter,
} from './middleware/middleware';
import { globalErrorHandler, notFoundHandler } from './global/errorHandler';
import { connectDatabase } from './databases/db';
import apiRoutes from './routes';

const app: Express = express();

export const initializeApp = async (): Promise<Express> => {
  try {
    await connectDatabase();
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
  // Security Middleware (must be first)
  app.use(helmetMiddleware);
  app.use(mongoSanitizeMiddleware);

  // Body parsing with size limits
  app.use(express.json({ limit: `${config.security.maxRequestSize}b` }));
  app.use(express.urlencoded({ extended: true, limit: `${config.security.maxRequestSize}b` }));

  // CORS
  app.use(corsMiddleware);

  // Rate limiting
  app.use(rateLimiter);

  // Request logging
  app.use(requestLogger);

  // Additional security headers
  app.use(securityMiddleware);

  // Health Check
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      env: config.app.env,
    });
  });

  // API Routes (v1)
  app.use(config.api.prefix, apiRoutes);

  // 404 Handler
  app.use(notFoundHandler);

  // Global Error Handler (must be last)
  app.use(globalErrorHandler);

  return app;
};

export default app;
