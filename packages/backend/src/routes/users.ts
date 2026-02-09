import type { UserSearchParams } from '@admin-dashboard/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { AppError } from '../core/errors';
import { logAuditAction } from '../core/middleware/audit';
import { authMiddleware } from '../core/middleware/auth';
import { requirePermission } from '../core/middleware/permissions';
import { groupService, settingsService, userService } from '../services';
import type { AppEnv } from '../core/types/context';
import {
  ErrorCodes,
  badRequest,
  errorResponse,
  notFound,
  paginatedResponse,
  successResponse,
} from '../core/utils/response';

const userRoutes = new Hono<AppEnv>();

// Apply auth middleware to all routes
userRoutes.use('*', authMiddleware);

// Validation schemas
const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  photoURL: z.string().url().nullable().optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
    })
    .optional(),
});

const changeGroupSchema = z.object({
  groupId: z.string().min(1, 'Group ID is required'),
});

/**
 * GET /api/v1/users
 * List all users with pagination and filtering
 * Supports cursor-based pagination via 'cursor' query param
 */
userRoutes.get('/', requirePermission('users:list'), async (c) => {
  const params: UserSearchParams & { cursor?: string } = {
    page: Number.parseInt(c.req.query('page') || '1'),
    limit: Math.min(Number.parseInt(c.req.query('limit') || '20'), 100),
    status: (c.req.query('status') as 'active' | 'disabled' | 'all') || 'all',
    groupId: c.req.query('groupId') || undefined,
    query: c.req.query('query') || undefined,
    sortBy: c.req.query('sortBy') || 'createdAt',
    sortOrder: (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc',
    cursor: c.req.query('cursor') || undefined,
  };

  const { users, total, nextCursor } = await userService.listUsers(params);

  return paginatedResponse(c, users, {
    page: params.page!,
    limit: params.limit!,
    total,
    ...(nextCursor && { nextCursor }),
  });
});

/**
 * GET /api/v1/users/:id
 * Get a user by ID
 */
userRoutes.get('/:id', requirePermission('users:read'), async (c) => {
  const userId = c.req.param('id');
  const currentUser = c.get('user');

  // Non-super-admins without users:list can only read their own profile
  if (!currentUser.isSuperAdmin && !currentUser.permissions.includes('users:list') && userId !== currentUser.uid) {
    return errorResponse(c, ErrorCodes.FORBIDDEN, 'You can only view your own profile', 403);
  }

  const user = await userService.getUserWithPermissions(userId);

  if (!user) {
    return notFound(c, 'User');
  }

  return successResponse(c, user);
});

/**
 * PUT /api/v1/users/:id
 * Update a user
 */
userRoutes.put('/:id', requirePermission('users:update'), async (c) => {
  const userId = c.req.param('id');
  const currentUser = c.get('user');

  // Parse and validate request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return badRequest(c, 'Invalid JSON in request body');
  }
  const result = updateUserSchema.safeParse(body);

  if (!result.success) {
    return badRequest(c, 'Invalid request body', result.error.errors);
  }

  // Get existing user
  const existingUser = await userService.getUser(userId);

  if (!existingUser) {
    return notFound(c, 'User');
  }

  // Check if trying to modify a super admin
  if (existingUser.isSuperAdmin && !currentUser.isSuperAdmin) {
    return errorResponse(
      c,
      ErrorCodes.CANNOT_MODIFY_SUPER_ADMIN,
      'Cannot modify super administrator accounts',
      403
    );
  }

  // Update user - throws AppError on failure
  const updatedUser = await userService.updateUser(userId, result.data);

  // Log audit
  await logAuditAction(c, 'USER_UPDATED', 'users', userId, `Updated user ${updatedUser.email}`, {
    before: {
      displayName: existingUser.displayName,
      photoURL: existingUser.photoURL,
      preferences: existingUser.preferences,
    },
    after: {
      displayName: updatedUser.displayName,
      photoURL: updatedUser.photoURL,
      preferences: updatedUser.preferences,
    },
  });

  return successResponse(c, updatedUser);
});

/**
 * DELETE /api/v1/users/:id
 * Delete a user
 */
userRoutes.delete('/:id', requirePermission('users:delete'), async (c) => {
  const userId = c.req.param('id');
  const currentUser = c.get('user');

  // Prevent self-deletion
  if (userId === currentUser.uid) {
    return errorResponse(c, ErrorCodes.CANNOT_DELETE_SELF, 'You cannot delete yourself', 400);
  }

  // Get user before deletion for audit
  const user = await userService.getUser(userId);

  if (!user) {
    return notFound(c, 'User');
  }

  // Check if trying to delete a super admin
  if (user.isSuperAdmin) {
    return errorResponse(
      c,
      ErrorCodes.CANNOT_MODIFY_SUPER_ADMIN,
      'Cannot delete super administrator accounts',
      403
    );
  }

  // Delete user - throws AppError on failure (handled by global error handler)
  await userService.deleteUser(userId);

  // Log audit
  await logAuditAction(c, 'USER_DELETED', 'users', userId, `Deleted user ${user.email}`, {
    before: {
      email: user.email,
      displayName: user.displayName,
      groupId: user.groupId,
    },
    after: {},
  });

  return successResponse(c, { message: 'User deleted successfully' });
});

/**
 * POST /api/v1/users/:id/disable
 * Disable a user
 */
userRoutes.post('/:id/disable', requirePermission('users:update'), async (c) => {
  const userId = c.req.param('id');
  const currentUser = c.get('user');

  // Prevent self-disable
  if (userId === currentUser.uid) {
    return errorResponse(c, ErrorCodes.CANNOT_DISABLE_SELF, 'You cannot disable yourself', 400);
  }

  // Disable user - throws AppError on failure (handled by global error handler)
  const user = await userService.disableUser(userId, currentUser.uid);

  // Log audit
  await logAuditAction(c, 'USER_DISABLED', 'users', userId, `Disabled user ${user.email}`, {
    before: { status: 'active' },
    after: { status: 'disabled', disabledBy: currentUser.uid },
  });

  return successResponse(c, user);
});

/**
 * POST /api/v1/users/:id/enable
 * Enable a disabled user
 */
userRoutes.post('/:id/enable', requirePermission('users:update'), async (c) => {
  const userId = c.req.param('id');

  // Enable user - throws AppError on failure (handled by global error handler)
  const user = await userService.enableUser(userId);

  // Log audit
  await logAuditAction(c, 'USER_ENABLED', 'users', userId, `Enabled user ${user.email}`, {
    before: { status: 'disabled' },
    after: { status: 'active' },
  });

  return successResponse(c, user);
});

/**
 * PUT /api/v1/users/:id/group
 * Change a user's group
 */
userRoutes.put('/:id/group', requirePermission('users:update'), async (c) => {
  const userId = c.req.param('id');
  const currentUser = c.get('user');

  // Parse and validate request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return badRequest(c, 'Invalid JSON in request body');
  }
  const result = changeGroupSchema.safeParse(body);

  if (!result.success) {
    return badRequest(c, 'Invalid request body', result.error.errors);
  }

  // Get existing user
  const existingUser = await userService.getUser(userId);

  if (!existingUser) {
    return notFound(c, 'User');
  }

  // Check if trying to modify a super admin
  if (existingUser.isSuperAdmin && !currentUser.isSuperAdmin) {
    return errorResponse(
      c,
      ErrorCodes.CANNOT_MODIFY_SUPER_ADMIN,
      'Cannot modify super administrator accounts',
      403
    );
  }

  // Verify new group exists
  const newGroup = await groupService.getGroup(result.data.groupId);
  if (!newGroup) {
    return notFound(c, 'Group');
  }

  // Get old group for audit
  const oldGroup = await groupService.getGroup(existingUser.groupId);

  // Change user group - throws AppError on failure (handled by global error handler)
  const updatedUser = await userService.changeUserGroup(userId, result.data.groupId);

  // Log audit
  await logAuditAction(
    c,
    'USER_GROUP_CHANGED',
    'users',
    userId,
    `Changed user ${updatedUser.email} group from "${oldGroup?.name}" to "${newGroup.name}"`,
    {
      before: { groupId: existingUser.groupId, groupName: oldGroup?.name },
      after: { groupId: result.data.groupId, groupName: newGroup.name },
    }
  );

  return successResponse(c, updatedUser);
});

/**
 * POST /api/v1/users/:userId/groups/:groupId
 * Add user to group (changes user's group)
 */
userRoutes.post(':userId/groups/:groupId', requirePermission('users:update'), async (c) => {
  const userId = c.req.param('userId');
  const groupId = c.req.param('groupId');
  const currentUser = c.get('user');

  const existingUser = await userService.getUser(userId);
  if (!existingUser) {
    return notFound(c, 'User');
  }

  if (existingUser.isSuperAdmin && !currentUser.isSuperAdmin) {
    return errorResponse(c, ErrorCodes.CANNOT_MODIFY_SUPER_ADMIN, 'Cannot modify super administrator accounts', 403);
  }

  const newGroup = await groupService.getGroup(groupId);
  if (!newGroup) {
    return notFound(c, 'Group');
  }

  const oldGroup = await groupService.getGroup(existingUser.groupId);
  const updatedUser = await userService.changeUserGroup(userId, groupId);

  await logAuditAction(
    c,
    'USER_GROUP_CHANGED',
    'users',
    userId,
    `Changed user ${updatedUser.email} group from "${oldGroup?.name}" to "${newGroup.name}"`,
    {
      before: { groupId: existingUser.groupId, groupName: oldGroup?.name },
      after: { groupId, groupName: newGroup.name },
    }
  );

  return successResponse(c, updatedUser);
});

/**
 * DELETE /api/v1/users/:userId/groups/:groupId
 * Remove user from group (resets to default group)
 */
userRoutes.delete(':userId/groups/:groupId', requirePermission('users:update'), async (c) => {
  const userId = c.req.param('userId');
  const groupId = c.req.param('groupId');
  const currentUser = c.get('user');

  const existingUser = await userService.getUser(userId);
  if (!existingUser) {
    return notFound(c, 'User');
  }

  if (existingUser.isSuperAdmin && !currentUser.isSuperAdmin) {
    return errorResponse(c, ErrorCodes.CANNOT_MODIFY_SUPER_ADMIN, 'Cannot modify super administrator accounts', 403);
  }

  // Only remove if user is actually in this group
  if (existingUser.groupId !== groupId) {
    return badRequest(c, 'User is not in this group');
  }

  // Reset to default group
  const settings = await settingsService.getSettings();
  const defaultGroupId = settings.defaultGroupId || 'users';

  const oldGroup = await groupService.getGroup(groupId);
  const updatedUser = await userService.changeUserGroup(userId, defaultGroupId);
  const newGroup = await groupService.getGroup(defaultGroupId);

  await logAuditAction(
    c,
    'USER_GROUP_CHANGED',
    'users',
    userId,
    `Removed user ${updatedUser.email} from group "${oldGroup?.name}", reset to default "${newGroup?.name}"`,
    {
      before: { groupId, groupName: oldGroup?.name },
      after: { groupId: defaultGroupId, groupName: newGroup?.name },
    }
  );

  return successResponse(c, updatedUser);
});

export { userRoutes };
