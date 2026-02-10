import type {
  CreateUserInput,
  Group,
  UpdateUserInput,
  User,
  UserSearchParams,
  UserWithPermissions,
} from '@admin-dashboard/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { config } from '../config';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../core/errors';
import {
  Collections,
  convertFirestoreDoc,
  convertFirestoreDocs,
  getAuthAdmin,
  getDb,
} from '../core/lib/firebase-admin';
import { normalizeUserGroupIds } from './migration';

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
   * Normalize a user document to ensure groupIds is always a string[].
   * Handles backward compat with old groupId: string docs.
   */
  private normalizeUser(user: User | null): User | null {
    if (!user) return null;
    if (!Array.isArray(user.groupIds)) {
      const raw = user as unknown as Record<string, unknown>;
      user.groupIds = normalizeUserGroupIds(raw);
    }
    return user;
  }

  /**
   * Get a user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    const doc = await this.db.collection(Collections.USERS).doc(userId).get();
    return this.normalizeUser(convertFirestoreDoc<User>(doc));
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

    return this.normalizeUser(convertFirestoreDoc<User>(snapshot.docs[0]!));
  }

  /**
   * Get a user with their permissions resolved
   */
  async getUserWithPermissions(userId: string): Promise<UserWithPermissions | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    // Fetch all groups for the user
    const groupDocs = await Promise.all(
      user.groupIds.map((gid) => this.db.collection(Collections.GROUPS).doc(gid).get())
    );

    const permissionSet = new Set<string>();
    const groupNames: string[] = [];

    for (const groupDoc of groupDocs) {
      if (groupDoc.exists) {
        const group = convertFirestoreDoc<Group>(groupDoc);
        if (group) {
          groupNames.push(group.name);
          if (!user.isSuperAdmin) {
            for (const perm of group.permissions) {
              permissionSet.add(perm);
            }
          }
        }
      }
    }

    return {
      ...user,
      permissions: user.isSuperAdmin ? [] : [...permissionSet],
      groupNames: groupNames.length > 0 ? groupNames : ['Unknown'],
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
      baseQuery = baseQuery.where('groupIds', 'array-contains', groupId);
    }

    // When a search query is provided, we fetch a larger batch and filter in memory
    // to support matching on both email and displayName (Firestore can't do inequality
    // queries on two fields). This works well for admin dashboards with <10k users.
    // For larger scale, consider Algolia or Typesense.
    if (query) {
      const lowerQuery = query.toLowerCase();

      // Apply sorting before fetching
      const validSortFields = ['createdAt', 'updatedAt', 'displayName', 'email', 'lastLoginAt'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      baseQuery = baseQuery.orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc');

      // Fetch a larger batch for in-memory filtering
      const snapshot = await baseQuery.limit(500).get();
      let allUsers = convertFirestoreDocs<User>(snapshot).map((u) => this.normalizeUser(u)!);

      // Filter in memory by email or displayName
      allUsers = allUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(lowerQuery) ||
          (u.displayName && u.displayName.toLowerCase().includes(lowerQuery))
      );

      const total = allUsers.length;

      // Apply pagination to filtered results
      const offset = (page - 1) * limit;
      const users = allUsers.slice(offset, offset + limit);
      const hasMore = offset + limit < total;
      const nextCursor = hasMore && users.length > 0 ? users[users.length - 1]!.id : null;

      return { users, total, nextCursor };
    }

    // No search query — use standard Firestore pagination
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
    let users = convertFirestoreDocs<User>(snapshot).map((u) => this.normalizeUser(u)!);

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
    let groupIds = input.groupIds;
    if (!groupIds || groupIds.length === 0) {
      const settingsDoc = await this.db.collection(Collections.SETTINGS).doc('app').get();
      const defaultGroupId = settingsDoc.exists ? settingsDoc.data()?.defaultGroupId : 'users';
      groupIds = [defaultGroupId];
    }

    const now = new Date();
    const userId = this.db.collection(Collections.USERS).doc().id;

    const user: Omit<User, 'id'> = {
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      photoURL: input.photoURL || null,
      groupIds,
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
      }

      // Ensure super admin is in the admin group
      const updateData: Record<string, unknown> = { ...updates };
      if (shouldBeSuperAdmin) {
        updateData.groupIds = FieldValue.arrayUnion('admin');
      }

      await userRef.update(updateData);
      const updatedDoc = await userRef.get();
      return this.normalizeUser(convertFirestoreDoc<User>(updatedDoc))!;
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
      groupIds: isSuperAdmin ? ['admin'] : [defaultGroupId],
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
  async updateUser(userId: string, input: UpdateUserInput, actorId?: string): Promise<User> {
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

    // Merge preferences if provided
    if (input.preferences) {
      updates.preferences = {
        ...existingUser.preferences,
        ...input.preferences,
      };
    }

    // Handle status change
    if (input.status !== undefined && input.status !== existingUser.status) {
      const now = new Date();
      if (input.status === 'disabled') {
        if (existingUser.isSuperAdmin) {
          throw new ForbiddenError('Cannot disable super administrator accounts');
        }
        updates.status = 'disabled';
        updates.disabledAt = now;
        updates.disabledBy = actorId || '';
        try {
          await this.auth.updateUser(userId, { disabled: true });
        } catch (error) {
          console.warn(`Could not disable user ${userId} in Firebase Auth:`, error);
        }
      } else {
        updates.status = 'active';
        updates.disabledAt = null;
        updates.disabledBy = null;
        try {
          await this.auth.updateUser(userId, { disabled: false });
        } catch (error) {
          console.warn(`Could not enable user ${userId} in Firebase Auth:`, error);
        }
      }
    }

    // Handle groupIds change
    if (input.groupIds !== undefined) {
      // Validate all group IDs exist
      const groupDocs = await Promise.all(
        input.groupIds.map((gid) => this.db.collection(Collections.GROUPS).doc(gid).get())
      );
      for (let i = 0; i < groupDocs.length; i++) {
        if (!groupDocs[i]!.exists) {
          throw new ValidationError(`Group "${input.groupIds[i]}" not found`);
        }
      }
      updates.groupIds = input.groupIds;
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
   * Add a user to a group
   */
  async addUserToGroup(userId: string, groupId: string): Promise<User> {
    return this.db.runTransaction(async (transaction) => {
      const groupRef = this.db.collection(Collections.GROUPS).doc(groupId);
      const userRef = this.db.collection(Collections.USERS).doc(userId);

      const [groupDoc, userDoc] = await Promise.all([
        transaction.get(groupRef),
        transaction.get(userRef),
      ]);

      if (!groupDoc.exists) {
        throw new NotFoundError('Group');
      }

      if (!userDoc.exists) {
        throw new NotFoundError('User');
      }

      const user = convertFirestoreDoc<User>(userDoc)!;
      const rawData = userDoc.data() as Record<string, unknown>;
      user.groupIds = normalizeUserGroupIds(rawData);

      if (user.isSuperAdmin) {
        throw new ForbiddenError('Cannot modify super administrator accounts');
      }

      if (user.groupIds.includes(groupId)) {
        throw new ValidationError('User is already in this group');
      }

      const newGroupIds = [...user.groupIds, groupId];
      transaction.update(userRef, { groupIds: newGroupIds, updatedAt: new Date() });

      return { ...user, groupIds: newGroupIds, updatedAt: new Date() };
    });
  }

  /**
   * Remove a user from a group
   */
  async removeUserFromGroup(userId: string, groupId: string): Promise<User> {
    return this.db.runTransaction(async (transaction) => {
      const userRef = this.db.collection(Collections.USERS).doc(userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new NotFoundError('User');
      }

      const user = convertFirestoreDoc<User>(userDoc)!;
      const rawData = userDoc.data() as Record<string, unknown>;
      user.groupIds = normalizeUserGroupIds(rawData);

      if (user.isSuperAdmin) {
        throw new ForbiddenError('Cannot modify super administrator accounts');
      }

      if (!user.groupIds.includes(groupId)) {
        throw new ValidationError('User is not in this group');
      }

      if (user.groupIds.length <= 1) {
        throw new ValidationError('Cannot remove the last group. Users must belong to at least one group.');
      }

      const newGroupIds = user.groupIds.filter((gid) => gid !== groupId);
      transaction.update(userRef, { groupIds: newGroupIds, updatedAt: new Date() });

      return { ...user, groupIds: newGroupIds, updatedAt: new Date() };
    });
  }

  /**
   * Get users by group ID
   */
  async getUsersByGroup(groupId: string): Promise<User[]> {
    const snapshot = await this.db
      .collection(Collections.USERS)
      .where('groupIds', 'array-contains', groupId)
      .get();

    return convertFirestoreDocs<User>(snapshot).map((u) => this.normalizeUser(u)!);
  }

  /**
   * Count users by group ID
   */
  async countUsersByGroup(groupId: string): Promise<number> {
    const countSnapshot = await this.db
      .collection(Collections.USERS)
      .where('groupIds', 'array-contains', groupId)
      .count()
      .get();

    return countSnapshot.data().count;
  }
}
