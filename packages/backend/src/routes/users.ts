import type { UserSearchParams } from '@admin-dashboard/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { logAuditAction } from '../middleware/audit';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { GroupService } from '../services/group.service';
import { UserService } from '../services/user.service';
import type { AppEnv } from '../types/context';
import {
  ErrorCodes,
  badRequest,
  errorResponse,
  notFound,
  paginatedResponse,
  successResponse,
} from '../utils/response';

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
 */
userRoutes.get('/', requirePermission('users:list'), async (c) => {
  const params: UserSearchParams = {
    page: Number.parseInt(c.req.query('page') || '1'),
    limit: Math.min(Number.parseInt(c.req.query('limit') || '20'), 100),
    status: (c.req.query('status') as 'active' | 'disabled' | 'all') || 'all',
    groupId: c.req.query('groupId') || undefined,
    query: c.req.query('query') || undefined,
    sortBy: c.req.query('sortBy') || 'createdAt',
    sortOrder: (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc',
  };

  const userService = new UserService();
  const { users, total } = await userService.listUsers(params);

  return paginatedResponse(c, users, {
    page: params.page!,
    limit: params.limit!,
    total,
  });
});

/**
 * GET /api/v1/users/:id
 * Get a user by ID
 */
userRoutes.get('/:id', requirePermission('users:read'), async (c) => {
  const userId = c.req.param('id');
  const userService = new UserService();

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
  const body = await c.req.json();
  const result = updateUserSchema.safeParse(body);

  if (!result.success) {
    return badRequest(c, 'Invalid request body', result.error.errors);
  }

  const userService = new UserService();

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

  // Update user
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

  const userService = new UserService();

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

  try {
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
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'USER_NOT_FOUND') {
      return notFound(c, 'User');
    }

    if (message === 'CANNOT_DELETE_SUPER_ADMIN') {
      return errorResponse(
        c,
        ErrorCodes.CANNOT_MODIFY_SUPER_ADMIN,
        'Cannot delete super administrator accounts',
        403
      );
    }

    throw error;
  }
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

  const userService = new UserService();

  try {
    const user = await userService.disableUser(userId, currentUser.uid);

    // Log audit
    await logAuditAction(c, 'USER_DISABLED', 'users', userId, `Disabled user ${user.email}`, {
      before: { status: 'active' },
      after: { status: 'disabled', disabledBy: currentUser.uid },
    });

    return successResponse(c, user);
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'USER_NOT_FOUND') {
      return notFound(c, 'User');
    }

    if (message === 'CANNOT_DISABLE_SUPER_ADMIN') {
      return errorResponse(
        c,
        ErrorCodes.CANNOT_MODIFY_SUPER_ADMIN,
        'Cannot disable super administrator accounts',
        403
      );
    }

    if (message === 'USER_ALREADY_DISABLED') {
      return badRequest(c, 'User is already disabled');
    }

    throw error;
  }
});

/**
 * POST /api/v1/users/:id/enable
 * Enable a disabled user
 */
userRoutes.post('/:id/enable', requirePermission('users:update'), async (c) => {
  const userId = c.req.param('id');
  const userService = new UserService();

  try {
    const user = await userService.enableUser(userId);

    // Log audit
    await logAuditAction(c, 'USER_ENABLED', 'users', userId, `Enabled user ${user.email}`, {
      before: { status: 'disabled' },
      after: { status: 'active' },
    });

    return successResponse(c, user);
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'USER_NOT_FOUND') {
      return notFound(c, 'User');
    }

    if (message === 'USER_ALREADY_ACTIVE') {
      return badRequest(c, 'User is already active');
    }

    throw error;
  }
});

/**
 * PUT /api/v1/users/:id/group
 * Change a user's group
 */
userRoutes.put('/:id/group', requirePermission('users:update'), async (c) => {
  const userId = c.req.param('id');
  const currentUser = c.get('user');

  // Parse and validate request body
  const body = await c.req.json();
  const result = changeGroupSchema.safeParse(body);

  if (!result.success) {
    return badRequest(c, 'Invalid request body', result.error.errors);
  }

  const userService = new UserService();
  const groupService = new GroupService();

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

  try {
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
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'USER_NOT_FOUND') {
      return notFound(c, 'User');
    }

    if (message === 'GROUP_NOT_FOUND') {
      return notFound(c, 'Group');
    }

    if (message === 'CANNOT_MODIFY_SUPER_ADMIN') {
      return errorResponse(
        c,
        ErrorCodes.CANNOT_MODIFY_SUPER_ADMIN,
        'Cannot modify super administrator accounts',
        403
      );
    }

    throw error;
  }
});

export { userRoutes };
