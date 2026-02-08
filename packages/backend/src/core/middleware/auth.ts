import type { Group, User } from '@admin-dashboard/shared';
import type { MiddlewareHandler } from 'hono';
import { Collections, convertFirestoreDoc, getAuthAdmin, getDb } from '../lib/firebase-admin';
import type { AppEnv, AuthUser } from '../types/context';
import { ErrorCodes, errorResponse, unauthorized } from '../utils/response';

/**
 * Build an AuthUser object from a User record and permissions
 */
export function buildAuthUser(
  uid: string,
  userRecord: User,
  permissions: string[]
): AuthUser {
  return {
    uid,
    email: userRecord.email,
    displayName: userRecord.displayName,
    photoURL: userRecord.photoURL,
    isSuperAdmin: userRecord.isSuperAdmin,
    groupId: userRecord.groupId,
    permissions,
  };
}

/**
 * Authentication middleware
 * Validates Firebase ID token from Authorization header
 * Extracts user info and attaches to context
 * Returns 401 for invalid/missing tokens
 */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return unauthorized(c, 'Authorization header is required');
  }

  // Extract Bearer token
  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return unauthorized(c, 'Invalid authorization format. Use: Bearer <token>');
  }

  try {
    // Verify the Firebase ID token
    const auth = getAuthAdmin();
    const decodedToken = await auth.verifyIdToken(token, true);

    // Get user document from Firestore
    const db = getDb();
    const userDoc = await db.collection(Collections.USERS).doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      // User doesn't exist in our database yet - this can happen on first login
      // The login endpoint should create the user
      return unauthorized(c, 'User not registered. Please complete registration.');
    }

    const userRecord = convertFirestoreDoc<User>(userDoc);

    if (!userRecord) {
      return unauthorized(c, 'Failed to load user data');
    }

    // Check if user is disabled
    if (userRecord.status === 'disabled') {
      return errorResponse(
        c,
        ErrorCodes.USER_DISABLED,
        'Your account has been disabled. Please contact an administrator.',
        403
      );
    }

    // Get user's group to fetch permissions
    let permissions: string[] = [];

    if (!userRecord.isSuperAdmin) {
      const groupDoc = await db.collection(Collections.GROUPS).doc(userRecord.groupId).get();
      if (groupDoc.exists) {
        const group = convertFirestoreDoc<Group>(groupDoc);
        permissions = group?.permissions || [];
      }
    }

    // Build auth user object and attach to context
    const authUser = buildAuthUser(decodedToken.uid, userRecord, permissions);
    c.set('user', authUser);
    c.set('userRecord', userRecord);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    // Handle specific Firebase Auth errors
    const errorCode = (error as { code?: string }).code;

    if (errorCode === 'auth/id-token-expired') {
      return errorResponse(
        c,
        ErrorCodes.TOKEN_EXPIRED,
        'Your session has expired. Please sign in again.',
        401
      );
    }

    if (errorCode === 'auth/id-token-revoked') {
      return unauthorized(c, 'Your session has been revoked. Please sign in again.');
    }

    if (errorCode === 'auth/argument-error') {
      return errorResponse(c, ErrorCodes.INVALID_TOKEN, 'Invalid token format', 401);
    }

    return unauthorized(c, 'Authentication failed');
  }
};

/**
 * Optional authentication middleware
 * Same as authMiddleware but allows unauthenticated requests
 * If token is present and valid, user info is attached to context
 * If token is missing or invalid, request continues without user info
 */
export const optionalAuthMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    await next();
    return;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    await next();
    return;
  }

  try {
    const auth = getAuthAdmin();
    const decodedToken = await auth.verifyIdToken(token, true);

    const db = getDb();
    const userDoc = await db.collection(Collections.USERS).doc(decodedToken.uid).get();

    if (userDoc.exists) {
      const userRecord = convertFirestoreDoc<User>(userDoc);

      // Check if user is disabled - don't authenticate disabled users
      if (userRecord && userRecord.status !== 'disabled') {
        let permissions: string[] = [];

        if (!userRecord.isSuperAdmin) {
          const groupDoc = await db.collection(Collections.GROUPS).doc(userRecord.groupId).get();
          if (groupDoc.exists) {
            const group = convertFirestoreDoc<Group>(groupDoc);
            permissions = group?.permissions || [];
          }
        }

        const authUser = buildAuthUser(decodedToken.uid, userRecord, permissions);
        c.set('user', authUser);
        c.set('userRecord', userRecord);
      }
    }
  } catch {
    // Silently ignore auth errors for optional auth
  }

  await next();
};
