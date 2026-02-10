import type { AuditAction, UserSearchParams } from '@admin-dashboard/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { logAuditAction } from '../core/middleware/audit';
import { authMiddleware } from '../core/middleware/auth';
import { requirePermission } from '../core/middleware/permissions';
import type { AppEnv } from '../core/types/context';
import {
  ErrorCodes,
  badRequest,
  errorResponse,
  notFound,
  paginatedResponse,
  successResponse,
} from '../core/utils/response';
import { groupService, userService } from '../services';

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
  status: z.enum(['active', 'disabled']).optional(),
  groupIds: z.array(z.string()).optional(),
});

/**
 * GET /api/v1/users
 * List all users with pagination and filtering
 * Supports cursor-based pagination via 'cursor' query param
 */
userRoutes.get('/', requirePermission('users:list'), async (c) => {
  const params: UserSearchParams & { cursor?: string } = {
    page: Number.parseInt(c.req.query('page') || '1'),
    limit: Math.min(Number.parseInt(c.req.query('limit') || c.req.query('pageSize') || '20'), 100),
    status: (c.req.query('status') as 'active' | 'disabled' | 'all') || 'all',
    groupId: c.req.query('groupId') || undefined,
    query: c.req.query('query') || c.req.query('search') || undefined,
    sortBy: c.req.query('sortBy') || 'createdAt',
    sortOrder: (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc',
    cursor: c.req.query('cursor') || undefined,
  };

  const { users, total, nextCursor } = await userService.listUsers(params);

  // Resolve groupIds to groupNames for each user
  const allGroupIds = [...new Set(users.flatMap((u) => u.groupIds).filter(Boolean))];
  const groupMap = new Map<string, string>();
  for (const gid of allGroupIds) {
    const group = await groupService.getGroup(gid);
    if (group) groupMap.set(gid, group.name);
  }
  const usersWithGroupNames = users.map((u) => ({
    ...u,
    groupNames: u.groupIds.map((gid) => groupMap.get(gid) || 'Unknown'),
  }));

  return paginatedResponse(c, usersWithGroupNames, {
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
  if (
    !currentUser.isSuperAdmin &&
    !currentUser.permissions.includes('users:list') &&
    userId !== currentUser.uid
  ) {
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

  // Non-super-admins without users:list can only update their own profile
  if (
    !currentUser.isSuperAdmin &&
    !currentUser.permissions.includes('users:list') &&
    userId !== currentUser.uid
  ) {
    return errorResponse(c, ErrorCodes.FORBIDDEN, 'You can only update your own profile', 403);
  }

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

  // Prevent self-disable
  if (result.data.status === 'disabled' && userId === currentUser.uid) {
    return errorResponse(c, ErrorCodes.CANNOT_DISABLE_SELF, 'You cannot disable yourself', 400);
  }

  // Update user - throws AppError on failure
  const updatedUser = await userService.updateUser(userId, result.data, currentUser.uid);

  // Log audit
  const before: Record<string, unknown> = {
    displayName: existingUser.displayName,
    photoURL: existingUser.photoURL,
    preferences: existingUser.preferences,
  };
  const after: Record<string, unknown> = {
    displayName: updatedUser.displayName,
    photoURL: updatedUser.photoURL,
    preferences: updatedUser.preferences,
  };
  if (result.data.status !== undefined) {
    before.status = existingUser.status;
    after.status = updatedUser.status;
  }
  if (result.data.groupIds !== undefined) {
    before.groupIds = existingUser.groupIds;
    after.groupIds = updatedUser.groupIds;
  }

  let auditAction: AuditAction = 'USER_UPDATED';
  let description = `Updated user ${updatedUser.email}`;
  if (result.data.status === 'disabled' && existingUser.status !== 'disabled') {
    auditAction = 'USER_DISABLED';
    description = `Disabled user ${updatedUser.email}`;
  } else if (result.data.status === 'active' && existingUser.status !== 'active') {
    auditAction = 'USER_ENABLED';
    description = `Enabled user ${updatedUser.email}`;
  }

  await logAuditAction(c, auditAction, 'users', userId, description, { before, after });

  return successResponse(c, updatedUser);
});

/**
 * DELETE /api/v1/users/:id
 * Delete a user
 */
userRoutes.delete('/:id', requirePermission('users:delete'), async (c) => {
  const userId = c.req.param('id');
  const currentUser = c.get('user');

  // Non-super-admins without users:list can only delete their own account
  if (
    !currentUser.isSuperAdmin &&
    !currentUser.permissions.includes('users:list') &&
    userId !== currentUser.uid
  ) {
    return errorResponse(c, ErrorCodes.FORBIDDEN, 'You can only delete your own account', 403);
  }

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
      groupIds: user.groupIds,
    },
    after: {},
  });

  return successResponse(c, { message: 'User deleted successfully' });
});

export { userRoutes };
