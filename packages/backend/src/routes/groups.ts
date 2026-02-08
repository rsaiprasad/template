import { ALL_PERMISSIONS, type Permission } from '@admin-dashboard/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { AppError } from '../core/errors';
import { logAuditAction } from '../core/middleware/audit';
import { authMiddleware } from '../core/middleware/auth';
import { requirePermission } from '../core/middleware/permissions';
import { groupService } from '../services';
import type { AppEnv } from '../core/types/context';
import {
  ErrorCodes,
  badRequest,
  errorResponse,
  notFound,
  successResponse,
} from '../core/utils/response';

const groupRoutes = new Hono<AppEnv>();

// Apply auth middleware to all routes
groupRoutes.use('*', authMiddleware);

// Validation schemas
const createGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).default(''),
  permissions: z.array(z.string()).optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const updatePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

/**
 * GET /api/v1/groups
 * List all groups
 */
groupRoutes.get('/', requirePermission('groups:list'), async (c) => {
  const includeUserCounts = c.req.query('includeUserCounts') === 'true';

  if (includeUserCounts) {
    const groups = await groupService.listGroupsWithUserCounts();
    return successResponse(c, groups);
  }

  const groups = await groupService.listGroups();
  return successResponse(c, groups);
});

/**
 * POST /api/v1/groups
 * Create a new group
 */
groupRoutes.post('/', requirePermission('groups:create'), async (c) => {
  const currentUser = c.get('user');

  // Parse and validate request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return badRequest(c, 'Invalid JSON in request body');
  }
  const result = createGroupSchema.safeParse(body);

  if (!result.success) {
    return badRequest(c, 'Invalid request body', result.error.errors);
  }

  // Validate permissions if provided
  if (result.data.permissions) {
    const invalidPermissions = result.data.permissions.filter(
      (p) => !ALL_PERMISSIONS.includes(p as Permission)
    );
    if (invalidPermissions.length > 0) {
      return badRequest(c, 'Invalid permissions', { invalidPermissions });
    }
  }

  // Create group - permissions are validated above, safe to cast
  const input = { ...result.data, permissions: result.data.permissions as Permission[] | undefined };
  const group = await groupService.createGroup(input, currentUser.uid);

  // Log audit
  await logAuditAction(c, 'GROUP_CREATED', 'groups', group.id, `Created group "${group.name}"`, {
    before: {},
    after: {
      name: group.name,
      description: group.description,
      permissions: group.permissions,
    },
  });

  return successResponse(c, group, 201);
});

/**
 * GET /api/v1/groups/:id
 * Get a group by ID
 */
groupRoutes.get('/:id', requirePermission('groups:read'), async (c) => {
  const groupId = c.req.param('id');

  const group = await groupService.getGroup(groupId);

  if (!group) {
    return notFound(c, 'Group');
  }

  return successResponse(c, group);
});

/**
 * PUT /api/v1/groups/:id
 * Update a group
 */
groupRoutes.put('/:id', requirePermission('groups:update'), async (c) => {
  const groupId = c.req.param('id');
  const currentUser = c.get('user');

  // Parse and validate request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return badRequest(c, 'Invalid JSON in request body');
  }
  const result = updateGroupSchema.safeParse(body);

  if (!result.success) {
    return badRequest(c, 'Invalid request body', result.error.errors);
  }

  // Get existing group
  const existingGroup = await groupService.getGroup(groupId);

  if (!existingGroup) {
    return notFound(c, 'Group');
  }

  // Update group - throws AppError on failure (handled by global error handler)
  const updatedGroup = await groupService.updateGroup(groupId, result.data, currentUser.uid);

  // Log audit
  await logAuditAction(
    c,
    'GROUP_UPDATED',
    'groups',
    groupId,
    `Updated group "${updatedGroup.name}"`,
    {
      before: {
        name: existingGroup.name,
        description: existingGroup.description,
      },
      after: {
        name: updatedGroup.name,
        description: updatedGroup.description,
      },
    }
  );

  return successResponse(c, updatedGroup);
});

/**
 * DELETE /api/v1/groups/:id
 * Delete a group
 */
groupRoutes.delete('/:id', requirePermission('groups:delete'), async (c) => {
  const groupId = c.req.param('id');

  // Get group before deletion for audit
  const group = await groupService.getGroup(groupId);

  if (!group) {
    return notFound(c, 'Group');
  }

  // Delete group - throws AppError on failure (handled by global error handler)
  await groupService.deleteGroup(groupId);

  // Log audit
  await logAuditAction(c, 'GROUP_DELETED', 'groups', groupId, `Deleted group "${group.name}"`, {
    before: {
      name: group.name,
      description: group.description,
      permissions: group.permissions,
    },
    after: {},
  });

  return successResponse(c, { message: 'Group deleted successfully' });
});

/**
 * GET /api/v1/groups/:id/users
 * Get users in a group
 */
groupRoutes.get('/:id/users', requirePermission('groups:read'), async (c) => {
  const groupId = c.req.param('id');

  // Get group users - throws AppError on failure (handled by global error handler)
  const users = await groupService.getGroupUsers(groupId);
  return successResponse(c, users);
});

/**
 * PUT /api/v1/groups/:id/permissions
 * Update group permissions
 */
groupRoutes.put('/:id/permissions', requirePermission('groups:update'), async (c) => {
  const groupId = c.req.param('id');
  const currentUser = c.get('user');

  // Parse and validate request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return badRequest(c, 'Invalid JSON in request body');
  }
  const result = updatePermissionsSchema.safeParse(body);

  if (!result.success) {
    return badRequest(c, 'Invalid request body', result.error.errors);
  }

  // Validate all permissions are valid
  const invalidPermissions = result.data.permissions.filter(
    (p) => !ALL_PERMISSIONS.includes(p as Permission)
  );

  if (invalidPermissions.length > 0) {
    return badRequest(c, 'Invalid permissions', { invalidPermissions });
  }

  // Get existing group
  const existingGroup = await groupService.getGroup(groupId);

  if (!existingGroup) {
    return notFound(c, 'Group');
  }

  // Update permissions - throws AppError on failure (handled by global error handler)
  const updatedGroup = await groupService.updateGroupPermissions(
    groupId,
    result.data.permissions as Permission[],
    currentUser.uid
  );

  // Log audit
  await logAuditAction(
    c,
    'GROUP_PERMISSIONS_CHANGED',
    'groups',
    groupId,
    `Updated permissions for group "${updatedGroup.name}"`,
    {
      before: { permissions: existingGroup.permissions },
      after: { permissions: updatedGroup.permissions },
    }
  );

  return successResponse(c, updatedGroup);
});

/**
 * POST /api/v1/groups/:id/permissions/:permissionId
 * Add a single permission to a group
 */
groupRoutes.post('/:id/permissions/:permissionId', requirePermission('groups:update'), async (c) => {
  const groupId = c.req.param('id');
  const permissionId = c.req.param('permissionId') as Permission;
  const currentUser = c.get('user');

  // Validate the permission
  if (!ALL_PERMISSIONS.includes(permissionId)) {
    return badRequest(c, 'Invalid permission', { permission: permissionId });
  }

  // Get existing group
  const existingGroup = await groupService.getGroup(groupId);

  if (!existingGroup) {
    return notFound(c, 'Group');
  }

  // Check if permission already exists
  if (existingGroup.permissions.includes(permissionId)) {
    return successResponse(c, existingGroup);
  }

  // Add the permission
  const newPermissions = [...existingGroup.permissions, permissionId];
  const updatedGroup = await groupService.updateGroupPermissions(
    groupId,
    newPermissions,
    currentUser.uid
  );

  // Log audit
  await logAuditAction(
    c,
    'GROUP_PERMISSIONS_CHANGED',
    'groups',
    groupId,
    `Added permission "${permissionId}" to group "${updatedGroup.name}"`,
    {
      before: { permissions: existingGroup.permissions },
      after: { permissions: updatedGroup.permissions },
    }
  );

  return successResponse(c, updatedGroup);
});

/**
 * DELETE /api/v1/groups/:id/permissions/:permissionId
 * Remove a single permission from a group
 */
groupRoutes.delete('/:id/permissions/:permissionId', requirePermission('groups:update'), async (c) => {
  const groupId = c.req.param('id');
  const permissionId = c.req.param('permissionId') as Permission;
  const currentUser = c.get('user');

  // Validate the permission
  if (!ALL_PERMISSIONS.includes(permissionId)) {
    return badRequest(c, 'Invalid permission', { permission: permissionId });
  }

  // Get existing group
  const existingGroup = await groupService.getGroup(groupId);

  if (!existingGroup) {
    return notFound(c, 'Group');
  }

  // Check if permission exists
  if (!existingGroup.permissions.includes(permissionId)) {
    return successResponse(c, existingGroup);
  }

  // Remove the permission
  const newPermissions = existingGroup.permissions.filter((p) => p !== permissionId);
  const updatedGroup = await groupService.updateGroupPermissions(
    groupId,
    newPermissions,
    currentUser.uid
  );

  // Log audit
  await logAuditAction(
    c,
    'GROUP_PERMISSIONS_CHANGED',
    'groups',
    groupId,
    `Removed permission "${permissionId}" from group "${updatedGroup.name}"`,
    {
      before: { permissions: existingGroup.permissions },
      after: { permissions: updatedGroup.permissions },
    }
  );

  return successResponse(c, updatedGroup);
});

export { groupRoutes };
