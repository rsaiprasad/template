import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  type Permission,
  getPermissionsByResource,
} from '@admin-dashboard/shared';
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { AppEnv } from '../types/context';
import { successResponse } from '../utils/response';

const permissionRoutes = new Hono<AppEnv>();

// Apply auth middleware to all routes
permissionRoutes.use('*', authMiddleware);

/**
 * Response type for permission list
 */
interface PermissionListResponse {
  permissions: Array<{
    id: Permission;
    resource: string;
    action: string;
    description: string;
  }>;
  byResource: Record<string, Permission[]>;
  total: number;
}

/**
 * GET /api/v1/permissions
 * List all available permissions in the system
 */
permissionRoutes.get('/', (c) => {
  const user = c.get('user');

  // Only super admins and users with groups:update can see all permissions
  // (since they need to know what permissions are available to assign)
  if (!(user.isSuperAdmin || user.permissions.includes('groups:update'))) {
    // Regular users can only see their own permissions
    return successResponse(c, {
      permissions: user.permissions.map((p) => ({
        id: p,
        ...(PERMISSIONS[p as Permission] || {
          resource: p.split(':')[0],
          action: p.split(':')[1],
          description: p,
        }),
      })),
      byResource: groupPermissionsByResource(user.permissions),
      total: user.permissions.length,
    });
  }

  // Return all system permissions
  const permissions = ALL_PERMISSIONS.map((p) => ({
    id: p,
    ...PERMISSIONS[p],
  }));

  const byResource: Record<string, Permission[]> = {
    users: getPermissionsByResource('users'),
    groups: getPermissionsByResource('groups'),
    settings: getPermissionsByResource('settings'),
    audit: getPermissionsByResource('audit'),
  };

  const response: PermissionListResponse = {
    permissions,
    byResource,
    total: ALL_PERMISSIONS.length,
  };

  return successResponse(c, response);
});

/**
 * GET /api/v1/permissions/my
 * Get the current user's permissions
 */
permissionRoutes.get('/my', (c) => {
  const user = c.get('user');

  // Super admins have all permissions
  if (user.isSuperAdmin) {
    return successResponse(c, {
      permissions: ALL_PERMISSIONS,
      byResource: {
        users: getPermissionsByResource('users'),
        groups: getPermissionsByResource('groups'),
        settings: getPermissionsByResource('settings'),
        audit: getPermissionsByResource('audit'),
      },
      isSuperAdmin: true,
      total: ALL_PERMISSIONS.length,
    });
  }

  return successResponse(c, {
    permissions: user.permissions,
    byResource: groupPermissionsByResource(user.permissions),
    isSuperAdmin: false,
    total: user.permissions.length,
  });
});

/**
 * GET /api/v1/permissions/check/:permission
 * Check if current user has a specific permission
 */
permissionRoutes.get('/check/:permission', (c) => {
  const user = c.get('user');
  const permission = c.req.param('permission') as Permission;

  // Validate the permission exists
  if (!ALL_PERMISSIONS.includes(permission)) {
    return successResponse(c, {
      permission,
      hasPermission: false,
      reason: 'Invalid permission',
    });
  }

  // Super admins have all permissions
  if (user.isSuperAdmin) {
    return successResponse(c, {
      permission,
      hasPermission: true,
      reason: 'Super admin has all permissions',
    });
  }

  const hasPermission = user.permissions.includes(permission);

  return successResponse(c, {
    permission,
    hasPermission,
    reason: hasPermission ? 'Permission granted through group' : 'Permission not granted',
  });
});

/**
 * GET /api/v1/permissions/resources
 * Get list of all permission resources
 */
permissionRoutes.get('/resources', (c) => {
  const resources = [
    {
      id: 'users',
      name: 'Users',
      description: 'User management permissions',
      permissions: getPermissionsByResource('users'),
    },
    {
      id: 'groups',
      name: 'Groups',
      description: 'Group management permissions',
      permissions: getPermissionsByResource('groups'),
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'Application settings permissions',
      permissions: getPermissionsByResource('settings'),
    },
    {
      id: 'audit',
      name: 'Audit',
      description: 'Audit log permissions',
      permissions: getPermissionsByResource('audit'),
    },
  ];

  return successResponse(c, resources);
});

/**
 * Helper function to group permissions by resource
 */
function groupPermissionsByResource(permissions: string[]): Record<string, string[]> {
  const byResource: Record<string, string[]> = {};

  for (const permission of permissions) {
    const [resource] = permission.split(':');
    if (resource) {
      if (!byResource[resource]) {
        byResource[resource] = [];
      }
      byResource[resource].push(permission);
    }
  }

  return byResource;
}

export { permissionRoutes };
