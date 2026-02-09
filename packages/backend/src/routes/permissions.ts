import type { Permission } from '@admin-dashboard/shared';
import { Hono } from 'hono';
import { authMiddleware } from '../core/middleware/auth';
import { getAllPermissions, getPermissionDefinitions } from '../core/permissions';
import type { AppEnv } from '../core/types/context';
import { successResponse } from '../core/utils/response';

const permissionRoutes = new Hono<AppEnv>();

// Apply auth middleware to all routes
permissionRoutes.use('*', authMiddleware);

/**
 * Response type for permission list
 */
interface PermissionListResponse {
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
    description: string;
  }>;
  byResource: Record<string, string[]>;
  total: number;
}

/**
 * GET /api/v1/permissions
 * List all available permissions in the system
 */
permissionRoutes.get('/', (c) => {
  const user = c.get('user');
  const allPermissions = getAllPermissions();
  const definitions = getPermissionDefinitions();

  // Only super admins and users with groups:update can see all permissions
  // (since they need to know what permissions are available to assign)
  if (!(user.isSuperAdmin || user.permissions.includes('groups:update'))) {
    // Regular users can only see their own permissions
    return successResponse(c, {
      permissions: user.permissions.map((p) => ({
        id: p,
        ...(definitions[p] || {
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
  const permissions = allPermissions.map((p) => {
    const def = definitions[p];
    const parts = p.split(':');
    return {
      id: p,
      resource: def?.resource ?? parts[0] ?? '',
      action: def?.action ?? parts[1] ?? '',
      description: def?.description ?? p,
    };
  });

  // Build byResource dynamically from all permissions
  const byResource: Record<string, string[]> = {};
  for (const p of allPermissions) {
    const resource = p.split(':')[0];
    if (resource) {
      if (!byResource[resource]) {
        byResource[resource] = [];
      }
      byResource[resource].push(p);
    }
  }

  const response: PermissionListResponse = {
    permissions,
    byResource,
    total: allPermissions.length,
  };

  return successResponse(c, response);
});

/**
 * GET /api/v1/permissions/my
 * Get the current user's permissions
 */
permissionRoutes.get('/my', (c) => {
  const user = c.get('user');
  const allPermissions = getAllPermissions();

  // Super admins have all permissions
  if (user.isSuperAdmin) {
    const byResource: Record<string, string[]> = {};
    for (const p of allPermissions) {
      const resource = p.split(':')[0];
      if (resource) {
        if (!byResource[resource]) {
          byResource[resource] = [];
        }
        byResource[resource].push(p);
      }
    }

    return successResponse(c, {
      permissions: allPermissions,
      byResource,
      isSuperAdmin: true,
      total: allPermissions.length,
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
  const allPermissions = getAllPermissions();

  // Validate the permission exists
  if (!allPermissions.includes(permission)) {
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
  const allPermissions = getAllPermissions();

  // Build resource list dynamically from all permissions
  const resourceMap = new Map<string, string[]>();
  for (const p of allPermissions) {
    const resource = p.split(':')[0];
    if (resource) {
      if (!resourceMap.has(resource)) {
        resourceMap.set(resource, []);
      }
      resourceMap.get(resource)?.push(p);
    }
  }

  const resources = Array.from(resourceMap.entries()).map(([id, permissions]) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    description: `${id.charAt(0).toUpperCase() + id.slice(1)} management permissions`,
    permissions,
  }));

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
