import type { Permission, UserWithPermissions } from '@admin-dashboard/shared';
import { inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getAuthAdmin } from '../core/lib/firebase-admin';
import { logAuditAction, loginAuditMiddleware } from '../core/middleware/audit';
import { authMiddleware, buildAuthUser, optionalAuthMiddleware } from '../core/middleware/auth';
import type { AppEnv } from '../core/types/context';
import { badRequest, internalError, successResponse, unauthorized } from '../core/utils/response';
import { db } from '../db';
import { groups } from '../db/schema';
import { auditService, groupService, settingsService, userService } from '../services';

const authRoutes = new Hono<AppEnv>();

// Schema for login request
const loginSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
});

/**
 * POST /api/v1/auth/login
 * Creates or updates user on login
 * This is called after the client successfully authenticates with Firebase
 */
authRoutes.post('/login', loginAuditMiddleware, async (c) => {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return badRequest(c, 'Invalid JSON in request body');
    }
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return badRequest(c, 'Invalid request body', result.error.errors);
    }

    const { idToken } = result.data;

    // Verify the ID token
    const auth = getAuthAdmin();
    let decodedToken;

    try {
      decodedToken = await auth.verifyIdToken(idToken, true);
    } catch (error) {
      const errorCode = (error as { code?: string }).code;

      // Log failed login attempt
      await auditService.createAuditLog({
        actorId: 'unknown',
        actorEmail: 'unknown',
        actorName: 'Unknown',
        action: 'LOGIN_FAILED',
        resource: 'auth',
        resourceId: 'unknown',
        description: `Login failed: ${errorCode || 'Invalid token'}`,
        ipAddress: c.get('clientIp'),
        userAgent: c.get('userAgent'),
      });

      if (errorCode === 'auth/id-token-expired') {
        return unauthorized(c, 'Token has expired. Please sign in again.');
      }
      return unauthorized(c, 'Invalid authentication token');
    }

    // Get or create user info from Firebase Auth
    const firebaseUserRecord = await auth.getUser(decodedToken.uid);

    // Initialize default groups and settings if needed
    await Promise.all([
      groupService.initializeDefaultGroups(),
      settingsService.initializeSettings(),
    ]);

    // Create or update user in our database
    const user = await userService.createOrUpdateOnLogin({
      uid: firebaseUserRecord.uid,
      email: firebaseUserRecord.email || '',
      displayName: firebaseUserRecord.displayName || null,
      photoURL: firebaseUserRecord.photoURL || null,
    });

    // Get user's permissions from all groups
    let permissions: string[] = [];
    const groupNames: string[] = [];

    if (!user.isSuperAdmin) {
      if (user.groupIds.length > 0) {
        const rows = await db
          .select({ name: groups.name, permissions: groups.permissions })
          .from(groups)
          .where(inArray(groups.id, user.groupIds));

        const permissionSet = new Set<string>();
        for (const row of rows) {
          groupNames.push(row.name);
          for (const perm of row.permissions) {
            permissionSet.add(perm);
          }
        }
        permissions = [...permissionSet] as Permission[];
      }
    } else {
      groupNames.push('Super Admin');
    }

    // Set user context for audit logging
    c.set('user', buildAuthUser(user.id, user, permissions));

    const userWithPermissions: UserWithPermissions = {
      ...user,
      permissions,
      groupNames: groupNames.length > 0 ? groupNames : ['Unknown'],
    };

    return successResponse(c, {
      user: userWithPermissions,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return internalError(c, 'Login failed');
  }
});

/**
 * POST /api/v1/auth/logout
 * Logs out the current user (records the logout event)
 */
authRoutes.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user');

  // Log logout event
  await logAuditAction(c, 'LOGOUT', 'auth', user.uid, `User ${user.email} logged out`);

  return successResponse(c, {
    message: 'Logout successful',
  });
});

/**
 * GET /api/v1/auth/me
 * Returns the current authenticated user's information
 */
authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const userRecord = c.get('userRecord');

  // Get group names
  const groupNames: string[] = [];

  if (!user.isSuperAdmin) {
    if (user.groupIds.length > 0) {
      const rows = await db
        .select({ name: groups.name })
        .from(groups)
        .where(inArray(groups.id, user.groupIds));

      for (const row of rows) {
        groupNames.push(row.name);
      }
    }
  } else {
    groupNames.push('Super Admin');
  }

  const userWithPermissions: UserWithPermissions = {
    ...userRecord,
    permissions: user.permissions,
    groupNames: groupNames.length > 0 ? groupNames : ['Unknown'],
  };

  return successResponse(c, userWithPermissions);
});

/**
 * GET /api/v1/auth/verify
 * Verifies the current token is still valid
 */
authRoutes.get('/verify', optionalAuthMiddleware, (c) => {
  const user = c.get('user');

  if (!user) {
    return successResponse(c, {
      authenticated: false,
    });
  }

  return successResponse(c, {
    authenticated: true,
    userId: user.uid,
    email: user.email,
  });
});

export { authRoutes };
