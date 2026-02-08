import type { AuditAction, AuditLogChanges, AuditResource } from '@admin-dashboard/shared';
import type { MiddlewareHandler } from 'hono';
import { AuditService } from '../../services/audit.service';
import type { AppEnv } from '../types/context';

/**
 * Audit context stored in the request for deferred logging
 */
export interface AuditContext {
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  description: string;
  changes?: AuditLogChanges;
}

/**
 * Creates an audit logging middleware
 * This middleware logs actions after the request completes successfully
 *
 * @param action - The audit action type
 * @param resource - The resource type being acted upon
 * @param getResourceId - Function to extract resource ID from the request
 * @param getDescription - Function to generate the audit description
 * @returns Middleware handler
 */
export function auditLog(
  action: AuditAction,
  resource: AuditResource,
  getResourceId: (c: Parameters<MiddlewareHandler<AppEnv>>[0]) => string,
  getDescription: (c: Parameters<MiddlewareHandler<AppEnv>>[0]) => string
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    // Execute the main handler first
    await next();

    // Only log if the request was successful (2xx status)
    const status = c.res.status;
    if (status < 200 || status >= 300) {
      return;
    }

    // Get user info from context
    const user = c.get('user');
    if (!user) {
      console.warn('Audit middleware: No user in context, skipping audit log');
      return;
    }

    try {
      const auditService = new AuditService();
      await auditService.createAuditLog({
        actorId: user.uid,
        actorEmail: user.email,
        actorName: user.displayName,
        action,
        resource,
        resourceId: getResourceId(c),
        description: getDescription(c),
        ipAddress: c.get('clientIp'),
        userAgent: c.get('userAgent'),
      });
    } catch (error) {
      // Don't fail the request if audit logging fails
      console.error('Failed to create audit log:', error);
    }
  };
}

/**
 * Creates an audit logging middleware with changes tracking
 * Use this when you need to record before/after state changes
 *
 * @param action - The audit action type
 * @param resource - The resource type being acted upon
 * @returns Middleware handler and a function to record changes
 */
export function createAuditLogger(
  action: AuditAction,
  resource: AuditResource
): {
  logAudit: (
    c: Parameters<MiddlewareHandler<AppEnv>>[0],
    resourceId: string,
    description: string,
    changes?: AuditLogChanges
  ) => Promise<void>;
} {
  return {
    logAudit: async (c, resourceId, description, changes) => {
      const user = c.get('user');
      if (!user) {
        console.warn('Audit logger: No user in context, skipping audit log');
        return;
      }

      try {
        const auditService = new AuditService();
        await auditService.createAuditLog({
          actorId: user.uid,
          actorEmail: user.email,
          actorName: user.displayName,
          action,
          resource,
          resourceId,
          description,
          changes,
          ipAddress: c.get('clientIp'),
          userAgent: c.get('userAgent'),
        });
      } catch (error) {
        console.error('Failed to create audit log:', error);
      }
    },
  };
}

/**
 * Helper to create a simple audit log entry from a route handler
 * Call this directly in your route handlers when you need more control
 */
export async function logAuditAction(
  c: Parameters<MiddlewareHandler<AppEnv>>[0],
  action: AuditAction,
  resource: AuditResource,
  resourceId: string,
  description: string,
  changes?: AuditLogChanges
): Promise<void> {
  const user = c.get('user');
  if (!user) {
    console.warn('logAuditAction: No user in context, skipping audit log');
    return;
  }

  try {
    const auditService = new AuditService();
    await auditService.createAuditLog({
      actorId: user.uid,
      actorEmail: user.email,
      actorName: user.displayName,
      action,
      resource,
      resourceId,
      description,
      changes,
      ipAddress: c.get('clientIp'),
      userAgent: c.get('userAgent'),
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Middleware to log login attempts
 * This is a special case that runs before authentication
 */
export const loginAuditMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const startTime = Date.now();

  await next();

  const duration = Date.now() - startTime;
  const status = c.res.status;
  const user = c.get('user');

  // Only log after the request completes
  try {
    const auditService = new AuditService();

    if (status >= 200 && status < 300 && user) {
      // Successful login
      await auditService.createAuditLog({
        actorId: user.uid,
        actorEmail: user.email,
        actorName: user.displayName,
        action: 'LOGIN',
        resource: 'auth',
        resourceId: user.uid,
        description: `User ${user.email} logged in successfully (${duration}ms)`,
        ipAddress: c.get('clientIp'),
        userAgent: c.get('userAgent'),
      });
    }
    // Note: Failed logins are logged by the auth route itself since we don't have user info
  } catch (error) {
    console.error('Failed to log login audit:', error);
  }
};
