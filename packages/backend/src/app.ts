import { swaggerUI } from '@hono/swagger-ui';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { config } from './config';
import { AppError } from './errors';
import { initializeFirebaseAdmin } from './lib/firebase-admin';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { createOpenAPIApp } from './openapi';
import type { AppEnv } from './types/context';
import {
  ErrorCodes,
  errorResponse,
  generateRequestId,
  getClientIp,
  getUserAgent,
} from './utils/response';

import { auditRoutes } from './routes/audit';
// Import routes
import { authRoutes } from './routes/auth';
import { groupRoutes } from './routes/groups';
import { permissionRoutes } from './routes/permissions';
import { settingsRoutes } from './routes/settings';
import { userRoutes } from './routes/users';

// Initialize Firebase Admin SDK
initializeFirebaseAdmin();

// Create the Hono app
const app = new Hono<AppEnv>();

// Request context middleware - adds requestId, clientIp, userAgent
app.use('*', async (c, next) => {
  c.set('requestId', generateRequestId());
  c.set('clientIp', getClientIp(c));
  c.set('userAgent', getUserAgent(c));
  await next();
});

// CORS middleware - uses exact origin matching from config
app.use(
  '*',
  cors({
    origin: (origin) => {
      // If no origin (e.g., server-to-server), return first configured origin
      if (!origin) return config.cors.origins[0];
      // Exact match against configured origins
      return config.cors.origins.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: config.cors.credentials,
    maxAge: 86400, // 24 hours
  })
);

// Rate limiting middleware - apply before routes
app.use('*', rateLimitMiddleware());

// Security headers
app.use('*', secureHeaders());

// Logger middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use('*', logger());
}

// Health check endpoint
app.get('/api/v1/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// Mount API routes
const apiV1 = new Hono<AppEnv>();

apiV1.route('/auth', authRoutes);
apiV1.route('/users', userRoutes);
apiV1.route('/groups', groupRoutes);
apiV1.route('/permissions', permissionRoutes);
apiV1.route('/settings', settingsRoutes);
apiV1.route('/audit', auditRoutes);

// Mount OpenAPI documentation
const openApiApp = createOpenAPIApp();
apiV1.route('/', openApiApp);

// Swagger UI at /swagger endpoint
apiV1.get('/swagger', swaggerUI({ url: '/api/v1/doc' }));

app.route('/api/v1', apiV1);

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);

  // Handle custom AppError instances
  if (err instanceof AppError) {
    const status = err.statusCode as 400 | 401 | 403 | 404 | 409 | 500;
    return errorResponse(c, err.code as typeof ErrorCodes[keyof typeof ErrorCodes], err.message, status);
  }

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    const status = err.status as 400 | 401 | 403 | 404 | 409 | 500;
    return errorResponse(
      c,
      status === 401
        ? ErrorCodes.UNAUTHORIZED
        : status === 403
          ? ErrorCodes.FORBIDDEN
          : status === 404
            ? ErrorCodes.NOT_FOUND
            : ErrorCodes.INTERNAL_ERROR,
      err.message,
      status
    );
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return errorResponse(
      c,
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      (err as { errors?: unknown }).errors
    );
  }

  // Handle Firebase Auth errors
  const errorCode = (err as { code?: string }).code;
  if (errorCode?.startsWith?.('auth/')) {
    const message = getFirebaseAuthErrorMessage(errorCode);
    return errorResponse(c, ErrorCodes.UNAUTHORIZED, message, 401);
  }

  // Generic error
  return errorResponse(
    c,
    ErrorCodes.INTERNAL_ERROR,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500
  );
});

// 404 handler
app.notFound((c) => {
  return errorResponse(c, ErrorCodes.NOT_FOUND, 'Endpoint not found', 404);
});

/**
 * Get user-friendly message for Firebase Auth errors
 */
function getFirebaseAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/id-token-expired': 'Your session has expired. Please sign in again.',
    'auth/id-token-revoked': 'Your session has been revoked. Please sign in again.',
    'auth/invalid-id-token': 'Invalid authentication token.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'User not found.',
    'auth/argument-error': 'Invalid authentication token format.',
  };
  return messages[code] || 'Authentication failed.';
}

export { app };
export default app;
