import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types/context';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { logAuditAction } from '../middleware/audit';
import { GroupService } from '../services/group.service';
import {
  successResponse,
  badRequest,
  notFound,
  errorResponse,
  ErrorCodes,
} from '../utils/response';
import { ALL_PERMISSIONS, type Permission } from '@admin-dashboard/shared';

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
  const groupService = new GroupService();

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
  const body = await c.req.json();
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

  const groupService = new GroupService();

  try {
    const group = await groupService.createGroup(result.data, currentUser.uid);

    // Log audit
    await logAuditAction(
      c,
      'GROUP_CREATED',
      'groups',
      group.id,
      `Created group "${group.name}"`,
      {
        before: {},
        after: {
          name: group.name,
          description: group.description,
          permissions: group.permissions,
        },
      }
    );

    return successResponse(c, group, 201);
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'GROUP_ALREADY_EXISTS') {
      return errorResponse(
        c,
        ErrorCodes.ALREADY_EXISTS,
        'A group with this name already exists',
        409
      );
    }

    throw error;
  }
});

/**
 * GET /api/v1/groups/:id
 * Get a group by ID
 */
groupRoutes.get('/:id', requirePermission('groups:read'), async (c) => {
  const groupId = c.req.param('id');
  const groupService = new GroupService();

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
  const body = await c.req.json();
  const result = updateGroupSchema.safeParse(body);

  if (!result.success) {
    return badRequest(c, 'Invalid request body', result.error.errors);
  }

  const groupService = new GroupService();

  // Get existing group
  const existingGroup = await groupService.getGroup(groupId);

  if (!existingGroup) {
    return notFound(c, 'Group');
  }

  try {
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
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'GROUP_NOT_FOUND') {
      return notFound(c, 'Group');
    }

    if (message === 'GROUP_NAME_CONFLICT') {
      return errorResponse(
        c,
        ErrorCodes.ALREADY_EXISTS,
        'A group with this name already exists',
        409
      );
    }

    throw error;
  }
});

/**
 * DELETE /api/v1/groups/:id
 * Delete a group
 */
groupRoutes.delete('/:id', requirePermission('groups:delete'), async (c) => {
  const groupId = c.req.param('id');
  const groupService = new GroupService();

  // Get group before deletion for audit
  const group = await groupService.getGroup(groupId);

  if (!group) {
    return notFound(c, 'Group');
  }

  try {
    await groupService.deleteGroup(groupId);

    // Log audit
    await logAuditAction(
      c,
      'GROUP_DELETED',
      'groups',
      groupId,
      `Deleted group "${group.name}"`,
      {
        before: {
          name: group.name,
          description: group.description,
          permissions: group.permissions,
        },
        after: {},
      }
    );

    return successResponse(c, { message: 'Group deleted successfully' });
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'GROUP_NOT_FOUND') {
      return notFound(c, 'Group');
    }

    if (message === 'CANNOT_DELETE_SYSTEM_GROUP') {
      return errorResponse(
        c,
        ErrorCodes.CANNOT_DELETE_SYSTEM_GROUP,
        'Cannot delete system groups',
        403
      );
    }

    if (message === 'CANNOT_DELETE_DEFAULT_GROUP') {
      return errorResponse(
        c,
        ErrorCodes.CANNOT_DELETE_DEFAULT_GROUP,
        'Cannot delete the default group',
        403
      );
    }

    if (message === 'GROUP_HAS_USERS') {
      return errorResponse(
        c,
        ErrorCodes.GROUP_HAS_USERS,
        'Cannot delete a group that has users. Please move users to another group first.',
        400
      );
    }

    throw error;
  }
});

/**
 * GET /api/v1/groups/:id/users
 * Get users in a group
 */
groupRoutes.get('/:id/users', requirePermission('groups:read'), async (c) => {
  const groupId = c.req.param('id');
  const groupService = new GroupService();

  try {
    const users = await groupService.getGroupUsers(groupId);
    return successResponse(c, users);
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'GROUP_NOT_FOUND') {
      return notFound(c, 'Group');
    }

    throw error;
  }
});

/**
 * PUT /api/v1/groups/:id/permissions
 * Update group permissions
 */
groupRoutes.put('/:id/permissions', requirePermission('groups:update'), async (c) => {
  const groupId = c.req.param('id');
  const currentUser = c.get('user');

  // Parse and validate request body
  const body = await c.req.json();
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

  const groupService = new GroupService();

  // Get existing group
  const existingGroup = await groupService.getGroup(groupId);

  if (!existingGroup) {
    return notFound(c, 'Group');
  }

  try {
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
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'GROUP_NOT_FOUND') {
      return notFound(c, 'Group');
    }

    throw error;
  }
});

export { groupRoutes };
