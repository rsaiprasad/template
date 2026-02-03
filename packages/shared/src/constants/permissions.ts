import type { Permission, PermissionDefinition, PermissionResource } from '../types/permission';

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

// Minimal permissions for regular users - can only read their own info
export const USER_PERMISSIONS: Permission[] = ['users:read'];

// Permission groupings by resource
export const USERS_PERMISSIONS: Permission[] = [
  'users:create',
  'users:read',
  'users:update',
  'users:delete',
  'users:list',
];

export const GROUPS_PERMISSIONS: Permission[] = [
  'groups:create',
  'groups:read',
  'groups:update',
  'groups:delete',
  'groups:list',
];

export const SETTINGS_PERMISSIONS: Permission[] = [
  'settings:create',
  'settings:read',
  'settings:update',
  'settings:delete',
  'settings:list',
];

export const AUDIT_PERMISSIONS: Permission[] = [
  'audit:create',
  'audit:read',
  'audit:update',
  'audit:delete',
  'audit:list',
];

// All resources for iterating
export const PERMISSION_RESOURCES: PermissionResource[] = ['users', 'groups', 'settings', 'audit'];

// Resource to permissions mapping
export const PERMISSIONS_BY_RESOURCE: Record<PermissionResource, Permission[]> = {
  users: USERS_PERMISSIONS,
  groups: GROUPS_PERMISSIONS,
  settings: SETTINGS_PERMISSIONS,
  audit: AUDIT_PERMISSIONS,
};

export const getPermissionsByResource = (resource: string): Permission[] => {
  return ALL_PERMISSIONS.filter((p) => p.startsWith(`${resource}:`));
};

export const getPermissionDescription = (permission: Permission): string => {
  return PERMISSIONS[permission]?.description ?? permission;
};
