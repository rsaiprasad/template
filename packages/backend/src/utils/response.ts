import type { Context } from 'hono';
import type { ApiSuccessResponse, ApiErrorResponse } from '@admin-dashboard/shared';

/**
 * Standard error codes used in API responses
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Business logic errors
  CANNOT_DELETE_SELF: 'CANNOT_DELETE_SELF',
  CANNOT_DISABLE_SELF: 'CANNOT_DISABLE_SELF',
  CANNOT_MODIFY_SUPER_ADMIN: 'CANNOT_MODIFY_SUPER_ADMIN',
  CANNOT_DELETE_SYSTEM_GROUP: 'CANNOT_DELETE_SYSTEM_GROUP',
  CANNOT_DELETE_DEFAULT_GROUP: 'CANNOT_DELETE_DEFAULT_GROUP',
  GROUP_HAS_USERS: 'GROUP_HAS_USERS',
  USER_DISABLED: 'USER_DISABLED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Creates a successful API response
 */
export function successResponse<T>(
  c: Context,
  data: T,
  status: 200 | 201 = 200,
  meta?: ApiSuccessResponse<T>['meta']
): Response {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return c.json(response, status);
}

/**
 * Creates a paginated successful API response
 */
export function paginatedResponse<T>(
  c: Context,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
): Response {
  const hasMore = pagination.page * pagination.limit < pagination.total;
  return successResponse(c, data, 200, {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    hasMore,
  });
}

/**
 * Creates an error API response
 */
export function errorResponse(
  c: Context,
  code: ErrorCode,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 500 | 503 = 500,
  details?: unknown
): Response {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details !== undefined) {
    response.error.details = details;
  }
  return c.json(response, status);
}

/**
 * Shorthand for 400 Bad Request
 */
export function badRequest(c: Context, message: string, details?: unknown): Response {
  return errorResponse(c, ErrorCodes.VALIDATION_ERROR, message, 400, details);
}

/**
 * Shorthand for 401 Unauthorized
 */
export function unauthorized(c: Context, message = 'Authentication required'): Response {
  return errorResponse(c, ErrorCodes.UNAUTHORIZED, message, 401);
}

/**
 * Shorthand for 403 Forbidden
 */
export function forbidden(c: Context, message = 'Access denied'): Response {
  return errorResponse(c, ErrorCodes.FORBIDDEN, message, 403);
}

/**
 * Shorthand for 404 Not Found
 */
export function notFound(c: Context, resource = 'Resource'): Response {
  return errorResponse(c, ErrorCodes.NOT_FOUND, `${resource} not found`, 404);
}

/**
 * Shorthand for 409 Conflict
 */
export function conflict(c: Context, message: string): Response {
  return errorResponse(c, ErrorCodes.CONFLICT, message, 409);
}

/**
 * Shorthand for 500 Internal Server Error
 */
export function internalError(c: Context, message = 'Internal server error'): Response {
  return errorResponse(c, ErrorCodes.INTERNAL_ERROR, message, 500);
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(c: Context): string {
  return c.req.header('user-agent') || 'unknown';
}
