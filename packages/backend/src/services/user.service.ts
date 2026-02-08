import type {
  CreateUserInput,
  Group,
  UpdateUserInput,
  User,
  UserSearchParams,
  UserWithPermissions,
} from '@admin-dashboard/shared';
import { config } from '../config';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../core/errors';
import {
  Collections,
  convertFirestoreDoc,
  convertFirestoreDocs,
  getAuthAdmin,
  getDb,
} from '../core/lib/firebase-admin';

/**
 * Cursor-based pagination result
 */
export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * User Service
 * Handles all user-related database operations
 */
export class UserService {
  private db = getDb();
  private auth = getAuthAdmin();

  /**
   * Get a user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    const doc = await this.db.collection(Collections.USERS).doc(userId).get();
    return convertFirestoreDoc<User>(doc);
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const snapshot = await this.db
      .collection(Collections.USERS)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return convertFirestoreDoc<User>(snapshot.docs[0]!);
  }

  /**
   * Get a user with their permissions resolved
   */
  async getUserWithPermissions(userId: string): Promise<UserWithPermissions | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    // Get the user's group
    const groupDoc = await this.db.collection(Collections.GROUPS).doc(user.groupId).get();
    const group = convertFirestoreDoc<Group>(groupDoc);

    return {
      ...user,
      permissions: user.isSuperAdmin ? [] : group?.permissions || [],
      groupName: group?.name || 'Unknown',
    };
  }

  /**
   * List users with pagination and filtering
   * Supports both offset-based (page) and cursor-based pagination
   *
   * Note: Full-text search is not natively supported by Firestore.
   * For production use with complex search requirements, consider integrating
   * an external search service like Algolia, Typesense, or Elasticsearch.
   * The current implementation uses prefix matching on email which can utilize indexes.
   */
  async listUsers(params: UserSearchParams & { cursor?: string } = {}): Promise<{
    users: User[];
    total: number;
    nextCursor: string | null;
  }> {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      groupId,
      query,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      cursor,
    } = params;

    let baseQuery: FirebaseFirestore.Query = this.db.collection(Collections.USERS);

    // Filter by status
    if (status !== 'all') {
      baseQuery = baseQuery.where('status', '==', status);
    }

    // Filter by group
    if (groupId) {
      baseQuery = baseQuery.where('groupId', '==', groupId);
    }

    // Search filtering at query level where possible
    // Note: Firestore doesn't support full-text search natively.
    // For simple prefix matching on email, we can use >= and < operators.
    // For full-text search, consider using Algolia, Typesense, or similar.
    // This implementation falls back to client-side filtering for displayName searches.
    if (query) {
      // Use email prefix matching at query level (can use index)
      // This is a basic implementation - for production, use a search service
      const lowerQuery = query.toLowerCase();
      baseQuery = baseQuery
        .where('email', '>=', lowerQuery)
        .where('email', '<', lowerQuery + '\uf8ff');
    }

    // Get total count (without pagination)
    const countSnapshot = await baseQuery.count().get();
    const total = countSnapshot.data().count;

    // Apply sorting
    const validSortFields = ['createdAt', 'updatedAt', 'displayName', 'email', 'lastLoginAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    baseQuery = baseQuery.orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc');

    // Cursor-based pagination (preferred for large datasets)
    if (cursor) {
      const cursorDoc = await this.db.collection(Collections.USERS).doc(cursor).get();
      if (cursorDoc.exists) {
        baseQuery = baseQuery.startAfter(cursorDoc);
      }
    } else if (page > 1) {
      // Fallback to offset-based pagination for backwards compatibility
      const offset = (page - 1) * limit;
      baseQuery = baseQuery.offset(offset);
    }

    // Limit results (fetch one extra to check if there are more)
    baseQuery = baseQuery.limit(limit + 1);

    const snapshot = await baseQuery.get();
    let users = convertFirestoreDocs<User>(snapshot);

    // Check if there are more results
    const hasMore = users.length > limit;
    if (hasMore) {
      users = users.slice(0, limit);
    }

    // Determine next cursor
    const nextCursor = hasMore && users.length > 0 ? users[users.length - 1]!.id : null;

    return { users, total, nextCursor };
  }

  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput, _creatorId: string): Promise<User> {
    // Check if user already exists with this email
    const existingUser = await this.getUserByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    // Get default group if not specified
    let groupId = input.groupId;
    if (!groupId) {
      const settingsDoc = await this.db.collection(Collections.SETTINGS).doc('app').get();
      groupId = settingsDoc.exists ? settingsDoc.data()?.defaultGroupId : 'users';
    }

    const now = new Date();
    const userId = this.db.collection(Collections.USERS).doc().id;

    const user: Omit<User, 'id'> = {
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      photoURL: input.photoURL || null,
      groupId: groupId!,
      isSuperAdmin: false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      preferences: {
        theme: 'system',
      },
    };

    await this.db.collection(Collections.USERS).doc(userId).set(user);

    return { id: userId, ...user };
  }

  /**
   * Create or update user on login (upsert)
   * Called when a user logs in through Firebase Auth
   */
  async createOrUpdateOnLogin(firebaseUser: {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
  }): Promise<User> {
    const userRef = this.db.collection(Collections.USERS).doc(firebaseUser.uid);
    const userDoc = await userRef.get();
    const now = new Date();

    if (userDoc.exists) {
      // Update existing user's last login time and potentially photo/name from provider
      const existingUser = userDoc.data() as User;
      const updates: Partial<User> = {
        lastLoginAt: now,
        updatedAt: now,
      };

      // Update display name and photo if they changed from the auth provider
      if (firebaseUser.displayName) {
        if (!existingUser.displayName || existingUser.displayName === existingUser.email) {
          updates.displayName = firebaseUser.displayName;
        }
      }

      if (firebaseUser.photoURL) {
        updates.photoURL = firebaseUser.photoURL;
      }

      // Enforce super admin status based on SUPER_ADMIN_EMAIL env var on every login
      const shouldBeSuperAdmin = !!(config.superAdminEmail && firebaseUser.email.toLowerCase() === config.superAdminEmail);
      if (shouldBeSuperAdmin !== existingUser.isSuperAdmin) {
        updates.isSuperAdmin = shouldBeSuperAdmin;
        if (shouldBeSuperAdmin) {
          updates.groupId = 'admin';
        }
      }

      await userRef.update(updates);
      const updatedDoc = await userRef.get();
      return convertFirestoreDoc<User>(updatedDoc)!;
    }

    // Get default group for new users
    const settingsDoc = await this.db.collection(Collections.SETTINGS).doc('app').get();
    const defaultGroupId = settingsDoc.exists ? settingsDoc.data()?.defaultGroupId : 'users';

    // Check if this user's email matches the configured super admin email
    const isSuperAdmin = !!(config.superAdminEmail && firebaseUser.email.toLowerCase() === config.superAdminEmail);

    // Create new user
    const newUser: Omit<User, 'id'> = {
      email: firebaseUser.email.toLowerCase(),
      displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User',
      photoURL: firebaseUser.photoURL,
      groupId: isSuperAdmin ? 'admin' : defaultGroupId,
      isSuperAdmin,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      preferences: {
        theme: 'system',
      },
    };

    await userRef.set(newUser);

    return { id: firebaseUser.uid, ...newUser };
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, input: UpdateUserInput): Promise<User> {
    const userRef = this.db.collection(Collections.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new NotFoundError('User');
    }

    const existingUser = convertFirestoreDoc<User>(userDoc)!;

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Apply individual fields
    if (input.displayName !== undefined) {
      updates.displayName = input.displayName;
    }

    if (input.photoURL !== undefined) {
      updates.photoURL = input.photoURL;
    }

    if (input.groupId !== undefined) {
      updates.groupId = input.groupId;
    }

    // Merge preferences if provided
    if (input.preferences) {
      updates.preferences = {
        ...existingUser.preferences,
        ...input.preferences,
      };
    }

    await userRef.update(updates);

    return { ...existingUser, ...updates } as User;
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<void> {
    const userRef = this.db.collection(Collections.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new NotFoundError('User');
    }

    const user = convertFirestoreDoc<User>(userDoc)!;

    // Prevent deleting super admins
    if (user.isSuperAdmin) {
      throw new ForbiddenError('Cannot delete super administrator accounts');
    }

    // Delete from Firestore
    await userRef.delete();

    // Optionally delete from Firebase Auth
    try {
      await this.auth.deleteUser(userId);
    } catch (error) {
      // User might not exist in Auth (e.g., if created manually)
      console.warn(`Could not delete user ${userId} from Firebase Auth:`, error);
    }
  }

  /**
   * Disable a user
   */
  async disableUser(userId: string, disabledBy: string): Promise<User> {
    const userRef = this.db.collection(Collections.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new NotFoundError('User');
    }

    const user = convertFirestoreDoc<User>(userDoc)!;

    if (user.isSuperAdmin) {
      throw new ForbiddenError('Cannot disable super administrator accounts');
    }

    if (user.status === 'disabled') {
      throw new ValidationError('User is already disabled');
    }

    const now = new Date();
    const updates: Partial<User> = {
      status: 'disabled',
      disabledAt: now,
      disabledBy,
      updatedAt: now,
    };

    await userRef.update(updates);

    // Also disable in Firebase Auth
    try {
      await this.auth.updateUser(userId, { disabled: true });
    } catch (error) {
      console.warn(`Could not disable user ${userId} in Firebase Auth:`, error);
    }

    return { ...user, ...updates };
  }

  /**
   * Enable a user
   */
  async enableUser(userId: string): Promise<User> {
    const userRef = this.db.collection(Collections.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new NotFoundError('User');
    }

    const user = convertFirestoreDoc<User>(userDoc)!;

    if (user.status === 'active') {
      throw new ValidationError('User is already active');
    }

    const updates: Partial<User> = {
      status: 'active',
      disabledAt: undefined,
      disabledBy: undefined,
      updatedAt: new Date(),
    };

    await userRef.update({
      status: 'active',
      disabledAt: null,
      disabledBy: null,
      updatedAt: new Date(),
    });

    // Also enable in Firebase Auth
    try {
      await this.auth.updateUser(userId, { disabled: false });
    } catch (error) {
      console.warn(`Could not enable user ${userId} in Firebase Auth:`, error);
    }

    return { ...user, ...updates };
  }

  /**
   * Change a user's group
   */
  async changeUserGroup(userId: string, newGroupId: string): Promise<User> {
    // Verify the new group exists
    const groupDoc = await this.db.collection(Collections.GROUPS).doc(newGroupId).get();
    if (!groupDoc.exists) {
      throw new NotFoundError('Group');
    }

    const userRef = this.db.collection(Collections.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new NotFoundError('User');
    }

    const user = convertFirestoreDoc<User>(userDoc)!;

    if (user.isSuperAdmin) {
      throw new ForbiddenError('Cannot modify super administrator accounts');
    }

    const updates: Partial<User> = {
      groupId: newGroupId,
      updatedAt: new Date(),
    };

    await userRef.update(updates);

    return { ...user, ...updates };
  }

  /**
   * Get users by group ID
   */
  async getUsersByGroup(groupId: string): Promise<User[]> {
    const snapshot = await this.db
      .collection(Collections.USERS)
      .where('groupId', '==', groupId)
      .get();

    return convertFirestoreDocs<User>(snapshot);
  }

  /**
   * Count users by group ID
   */
  async countUsersByGroup(groupId: string): Promise<number> {
    const countSnapshot = await this.db
      .collection(Collections.USERS)
      .where('groupId', '==', groupId)
      .count()
      .get();

    return countSnapshot.data().count;
  }
}
