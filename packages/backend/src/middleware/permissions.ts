import type { MiddlewareHandler } from 'hono';
import type { Permission } from '@admin-dashboard/shared';
import type { AppEnv } from '../types/context';
import { forbidden } from '../utils/response';

/**
 * Permission middleware factory
 * Creates a middleware that checks if the user has the required permission
 * Super admins bypass all permission checks
 *
 * @param permission - The required permission
 * @returns Middleware handler
 */
export function requirePermission(permission: Permission): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return forbidden(c, 'User context not available. Authentication required.');
    }

    // Super admins bypass all permission checks
    if (user.isSuperAdmin) {
      await next();
      return;
    }

    // Check if user has the required permission
    if (!user.permissions.includes(permission)) {
      return forbidden(
        c,
        `You do not have permission to perform this action. Required: ${permission}`
      );
    }

    await next();
  };
}

/**
 * Permission middleware factory for multiple permissions (ANY)
 * User must have at least one of the specified permissions
 *
 * @param permissions - Array of permissions (user needs at least one)
 * @returns Middleware handler
 */
export function requireAnyPermission(permissions: Permission[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return forbidden(c, 'User context not available. Authentication required.');
    }

    // Super admins bypass all permission checks
    if (user.isSuperAdmin) {
      await next();
      return;
    }

    // Check if user has any of the required permissions
    const hasPermission = permissions.some((p) => user.permissions.includes(p));

    if (!hasPermission) {
      return forbidden(
        c,
        `You do not have permission to perform this action. Required one of: ${permissions.join(', ')}`
      );
    }

    await next();
  };
}

/**
 * Permission middleware factory for multiple permissions (ALL)
 * User must have all of the specified permissions
 *
 * @param permissions - Array of permissions (user needs all)
 * @returns Middleware handler
 */
export function requireAllPermissions(permissions: Permission[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return forbidden(c, 'User context not available. Authentication required.');
    }

    // Super admins bypass all permission checks
    if (user.isSuperAdmin) {
      await next();
      return;
    }

    // Check if user has all required permissions
    const missingPermissions = permissions.filter((p) => !user.permissions.includes(p));

    if (missingPermissions.length > 0) {
      return forbidden(
        c,
        `You do not have all required permissions. Missing: ${missingPermissions.join(', ')}`
      );
    }

    await next();
  };
}

/**
 * Super admin only middleware
 * Only allows super admins to access the endpoint
 *
 * @returns Middleware handler
 */
export function requireSuperAdmin(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return forbidden(c, 'User context not available. Authentication required.');
    }

    if (!user.isSuperAdmin) {
      return forbidden(c, 'This action is restricted to super administrators.');
    }

    await next();
  };
}

/**
 * Check if the current user can modify another user
 * Prevents modifying super admins unless current user is also a super admin
 *
 * @param targetUserId - The ID of the user being modified
 * @param targetIsSuperAdmin - Whether the target user is a super admin
 * @returns Middleware handler
 */
export function canModifyUser(
  targetUserId: string,
  targetIsSuperAdmin: boolean
): (user: { uid: string; isSuperAdmin: boolean }) => { allowed: boolean; reason?: string } {
  return (user) => {
    // Can't modify super admins unless you are one
    if (targetIsSuperAdmin && !user.isSuperAdmin) {
      return {
        allowed: false,
        reason: 'Cannot modify super administrator accounts.',
      };
    }

    return { allowed: true };
  };
}

/**
 * Check if action on self is allowed
 * Used to prevent users from deleting/disabling themselves
 */
export function preventSelfAction(
  currentUserId: string,
  targetUserId: string,
  action: string
): { allowed: boolean; reason?: string } {
  if (currentUserId === targetUserId) {
    return {
      allowed: false,
      reason: `You cannot ${action} yourself.`,
    };
  }
  return { allowed: true };
}
