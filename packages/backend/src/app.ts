import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from './types/context';
import { errorResponse, ErrorCodes, generateRequestId, getClientIp, getUserAgent } from './utils/response';
import { initializeFirebaseAdmin } from './lib/firebase-admin';

// Import routes
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { groupRoutes } from './routes/groups';
import { permissionRoutes } from './routes/permissions';
import { settingsRoutes } from './routes/settings';
import { auditRoutes } from './routes/audit';

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

// CORS middleware
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow localhost for development
      if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
        return origin;
      }
      // Allow Firebase hosting domains
      if (origin?.includes('.web.app') || origin?.includes('.firebaseapp.com')) {
        return origin;
      }
      // Allow custom domains (configure as needed)
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (allowedOrigins.includes(origin || '')) {
        return origin;
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['X-Request-ID'],
    credentials: true,
    maxAge: 86400, // 24 hours
  })
);

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

app.route('/api/v1', apiV1);

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    const status = err.status as 400 | 401 | 403 | 404 | 409 | 500;
    return errorResponse(
      c,
      status === 401 ? ErrorCodes.UNAUTHORIZED :
      status === 403 ? ErrorCodes.FORBIDDEN :
      status === 404 ? ErrorCodes.NOT_FOUND :
      ErrorCodes.INTERNAL_ERROR,
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
