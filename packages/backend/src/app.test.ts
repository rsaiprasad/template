import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { AppError } from './core/errors';
import { ErrorCodes, errorResponse } from './core/utils/response';

/**
 * We test the global error handler logic in isolation since importing `app`
 * directly triggers Firebase Admin initialization.
 * Instead, we replicate the onError handler from app.ts and test its behavior.
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

function createTestApp() {
  const app = new Hono();

  // Route that throws various errors for testing
  app.get('/throw/app-error', () => {
    throw new AppError('Custom error', 400, 'VALIDATION_ERROR');
  });

  app.get('/throw/http-exception', () => {
    throw new HTTPException(403, { message: 'Forbidden' });
  });

  app.get('/throw/firebase-auth', () => {
    const err = new Error('Token expired');
    (err as unknown as Record<string, string>).code = 'auth/id-token-expired';
    throw err;
  });

  app.get('/throw/generic', () => {
    throw new Error('Unexpected error');
  });

  app.get('/health', (c) => {
    return c.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  });

  // Global error handler (same logic as app.ts)
  app.onError((err, c) => {
    if (err instanceof AppError) {
      const status = err.statusCode as 400 | 401 | 403 | 404 | 409 | 500;
      return errorResponse(
        c,
        err.code as (typeof ErrorCodes)[keyof typeof ErrorCodes],
        err.message,
        status
      );
    }

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

    if (err.name === 'ZodError') {
      return errorResponse(c, ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400);
    }

    const errorCode = (err as { code?: string }).code;
    if (errorCode?.startsWith?.('auth/')) {
      const message = getFirebaseAuthErrorMessage(errorCode);
      return errorResponse(c, ErrorCodes.UNAUTHORIZED, message, 401);
    }

    return errorResponse(c, ErrorCodes.INTERNAL_ERROR, err.message, 500);
  });

  // 404 handler
  app.notFound((c) => {
    return errorResponse(c, ErrorCodes.NOT_FOUND, 'Endpoint not found', 404);
  });

  return app;
}

describe('App Error Handling', () => {
  const app = createTestApp();

  describe('Health endpoint', () => {
    it('should return healthy status', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('healthy');
    });
  });

  describe('Global error handler', () => {
    it('should handle AppError correctly', async () => {
      const res = await app.request('/throw/app-error');
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Custom error');
    });

    it('should handle HTTPException correctly', async () => {
      const res = await app.request('/throw/http-exception');
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should handle Firebase Auth errors', async () => {
      const res = await app.request('/throw/firebase-auth');
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('expired');
    });

    it('should handle generic errors with 500', async () => {
      const res = await app.request('/throw/generic');
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await app.request('/does/not/exist');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Endpoint not found');
    });
  });
});

describe('getFirebaseAuthErrorMessage', () => {
  it('should return specific messages for known codes', () => {
    expect(getFirebaseAuthErrorMessage('auth/id-token-expired')).toContain('expired');
    expect(getFirebaseAuthErrorMessage('auth/user-disabled')).toContain('disabled');
  });

  it('should return generic message for unknown codes', () => {
    expect(getFirebaseAuthErrorMessage('auth/unknown')).toBe('Authentication failed.');
  });
});
