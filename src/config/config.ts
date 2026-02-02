import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
] as const;

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('✗ Missing required environment variables:', missingEnvVars.join(', '));
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Validate JWT secret strength in production
if (process.env.NODE_ENV === 'production') {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    console.error('✗ JWT_SECRET must be at least 32 characters long in production');
    process.exit(1);
  }
  if (jwtSecret === 'change_this_secret' || jwtSecret === 'default_secret') {
    console.error('✗ JWT_SECRET must be changed from default value in production');
    process.exit(1);
  }
}

export const config = {
  app: {
    name: process.env.APP_NAME || 'Calander API',
    port: parseInt(process.env.PORT || '3000', 10),
    env: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    version: '1.0.0',
  },
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || (process.env.NODE_ENV === 'production' ? '' : 'mongodb://localhost:27017/calander-db'),
      options: {
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 30000,
        serverSelectionTimeoutMS: 5000,
      },
    },
  },
  api: {
    prefix: process.env.API_PREFIX || '/api',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'change_this_secret'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    resetTokenExpiresIn: process.env.RESET_TOKEN_EXPIRES_IN || '15m',
  },

  security: {
    maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '10485760', 10), // 10MB default
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests per window
    rateLimitAuthMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10), // 5 auth requests per window
  },


};

export default config;
