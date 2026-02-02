import type { Permission, PermissionDefinition } from '../types/permission';

export const PERMISSIONS: Record<Permission, PermissionDefinition> = {
  // Users
  'users:create': {
    resource: 'users',
    action: 'create',
    description: 'Create new users',
  },
  'users:read': {
    resource: 'users',
    action: 'read',
    description: 'View user details',
  },
  'users:update': {
    resource: 'users',
    action: 'update',
    description: 'Update user information',
  },
  'users:delete': {
    resource: 'users',
    action: 'delete',
    description: 'Delete users',
  },
  'users:list': {
    resource: 'users',
    action: 'list',
    description: 'View list of users',
  },

  // Groups
  'groups:create': {
    resource: 'groups',
    action: 'create',
    description: 'Create new groups',
  },
  'groups:read': {
    resource: 'groups',
    action: 'read',
    description: 'View group details',
  },
  'groups:update': {
    resource: 'groups',
    action: 'update',
    description: 'Update group information',
  },
  'groups:delete': {
    resource: 'groups',
    action: 'delete',
    description: 'Delete groups',
  },
  'groups:list': {
    resource: 'groups',
    action: 'list',
    description: 'View list of groups',
  },

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
  'audit:read': {
    resource: 'audit',
    action: 'read',
    description: 'View audit log details',
  },
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
  'audit:list': {
    resource: 'audit',
    action: 'list',
    description: 'View audit logs',
  },
} as const;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const ADMIN_PERMISSIONS: Permission[] = ALL_PERMISSIONS;

export const USER_PERMISSIONS: Permission[] = ['users:read'];

export const getPermissionsByResource = (resource: string): Permission[] => {
  return ALL_PERMISSIONS.filter((p) => p.startsWith(`${resource}:`));
};

export const getPermissionDescription = (permission: Permission): string => {
  return PERMISSIONS[permission]?.description ?? permission;
};
