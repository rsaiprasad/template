import type { CorePermission, Permission, PermissionDefinition } from '@admin-dashboard/shared';
import { CUSTOM_PERMISSIONS } from '@admin-dashboard/shared';

/**
 * Core template permissions — users, groups, settings, audit.
 * These are infrastructure concerns and should not be edited by developers.
 * To add application-specific permissions, use CUSTOM_PERMISSIONS in
 * packages/shared/src/constants/permissions.ts
 */
export const CORE_PERMISSIONS: Record<CorePermission, PermissionDefinition> = {
  // Users
  'users:create': { resource: 'users', action: 'create', description: 'Create new users' },
  'users:read': { resource: 'users', action: 'read', description: 'View user details' },
  'users:update': {
    resource: 'users',
    action: 'update',
    description: 'Update user information',
  },
  'users:delete': { resource: 'users', action: 'delete', description: 'Delete users' },
  'users:list': { resource: 'users', action: 'list', description: 'View list of users' },

  // Groups
  'groups:create': { resource: 'groups', action: 'create', description: 'Create new groups' },
  'groups:read': { resource: 'groups', action: 'read', description: 'View group details' },
  'groups:update': {
    resource: 'groups',
    action: 'update',
    description: 'Update group information',
  },
  'groups:delete': { resource: 'groups', action: 'delete', description: 'Delete groups' },
  'groups:list': { resource: 'groups', action: 'list', description: 'View list of groups' },

  // Settings
  'settings:create': {
    resource: 'settings',
    action: 'create',
    description: 'Create application settings',
  },
  'settings:read': {
    resource: 'settings',
    action: 'read',
    description: 'View application settings',
  },
  'settings:update': {
    resource: 'settings',
    action: 'update',
    description: 'Update application settings',
  },
  'settings:delete': {
    resource: 'settings',
    action: 'delete',
    description: 'Delete application settings',
  },
  'settings:list': {
    resource: 'settings',
    action: 'list',
    description: 'View list of application settings',
  },

  // Audit
  'audit:create': {
    resource: 'audit',
    action: 'create',
    description: 'Create audit log entries',
  },
  'audit:read': { resource: 'audit', action: 'read', description: 'View audit log details' },
  'audit:update': {
    resource: 'audit',
    action: 'update',
    description: 'Update audit log entries',
  },
  'audit:delete': {
    resource: 'audit',
    action: 'delete',
    description: 'Delete audit log entries',
  },
  'audit:list': { resource: 'audit', action: 'list', description: 'View audit logs' },
};

/** All permissions (core + custom), merged. */
export function getAllPermissions(): Permission[] {
  return [...Object.keys(CORE_PERMISSIONS), ...Object.keys(CUSTOM_PERMISSIONS)];
}

/** All permission definitions (core + custom), merged. */
export function getPermissionDefinitions(): Record<string, PermissionDefinition> {
  return { ...CORE_PERMISSIONS, ...CUSTOM_PERMISSIONS };
}

/** Admin permissions — all core + all custom. */
export function getAdminPermissions(): Permission[] {
  return getAllPermissions();
}

/** Minimal permissions for regular users. */
export function getUserPermissions(): Permission[] {
  return ['users:read'];
}

/** Filter permissions by resource prefix. */
export function getPermissionsByResource(resource: string): Permission[] {
  return getAllPermissions().filter((p) => p.startsWith(`${resource}:`));
}

/** Get the description for a permission. */
export function getPermissionDescription(permission: string): string {
  const defs = getPermissionDefinitions();
  return defs[permission]?.description ?? permission;
}
