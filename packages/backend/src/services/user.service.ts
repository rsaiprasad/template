import {
  getDb,
  getAuthAdmin,
  Collections,
  convertFirestoreDoc,
  convertFirestoreDocs,
} from '../lib/firebase-admin';
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  UserSearchParams,
  Group,
  UserWithPermissions,
} from '@admin-dashboard/shared';

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
      permissions: user.isSuperAdmin ? [] : (group?.permissions || []),
      groupName: group?.name || 'Unknown',
    };
  }

  /**
   * List users with pagination and filtering
   */
  async listUsers(params: UserSearchParams = {}): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 20, status = 'all', groupId, query, sortBy = 'createdAt', sortOrder = 'desc' } = params;

    let baseQuery: FirebaseFirestore.Query = this.db.collection(Collections.USERS);

    // Filter by status
    if (status !== 'all') {
      baseQuery = baseQuery.where('status', '==', status);
    }

    // Filter by group
    if (groupId) {
      baseQuery = baseQuery.where('groupId', '==', groupId);
    }

    // Get total count (without pagination)
    const countSnapshot = await baseQuery.count().get();
    const total = countSnapshot.data().count;

    // Apply sorting
    const validSortFields = ['createdAt', 'updatedAt', 'displayName', 'email', 'lastLoginAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    baseQuery = baseQuery.orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc');

    // Apply pagination
    const offset = (page - 1) * limit;
    baseQuery = baseQuery.offset(offset).limit(limit);

    const snapshot = await baseQuery.get();
    let users = convertFirestoreDocs<User>(snapshot);

    // Client-side filtering for search query (Firestore doesn't support full-text search)
    if (query) {
      const lowerQuery = query.toLowerCase();
      users = users.filter(
        (user) =>
          user.displayName.toLowerCase().includes(lowerQuery) ||
          user.email.toLowerCase().includes(lowerQuery)
      );
    }

    return { users, total };
  }

  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput, creatorId: string): Promise<User> {
    // Check if user already exists with this email
    const existingUser = await this.getUserByEmail(input.email);
    if (existingUser) {
      throw new Error('USER_ALREADY_EXISTS');
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
  async createOrUpdateOnLogin(
    firebaseUser: {
      uid: string;
      email: string;
      displayName: string | null;
      photoURL: string | null;
    }
  ): Promise<User> {
    const userRef = this.db.collection(Collections.USERS).doc(firebaseUser.uid);
    const userDoc = await userRef.get();
    const now = new Date();

    if (userDoc.exists) {
      // Update existing user's last login time and potentially photo/name from provider
      const updates: Partial<User> = {
        lastLoginAt: now,
        updatedAt: now,
      };

      // Update display name and photo if they changed from the auth provider
      if (firebaseUser.displayName) {
        const existingUser = userDoc.data() as User;
        if (!existingUser.displayName || existingUser.displayName === existingUser.email) {
          updates.displayName = firebaseUser.displayName;
        }
      }

      if (firebaseUser.photoURL) {
        updates.photoURL = firebaseUser.photoURL;
      }

      await userRef.update(updates);
      const updatedDoc = await userRef.get();
      return convertFirestoreDoc<User>(updatedDoc)!;
    }

    // Get default group for new users
    const settingsDoc = await this.db.collection(Collections.SETTINGS).doc('app').get();
    const defaultGroupId = settingsDoc.exists ? settingsDoc.data()?.defaultGroupId : 'users';

    // Check if this is the first user - make them super admin
    const usersCount = await this.db.collection(Collections.USERS).count().get();
    const isFirstUser = usersCount.data().count === 0;

    // Create new user
    const newUser: Omit<User, 'id'> = {
      email: firebaseUser.email.toLowerCase(),
      displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User',
      photoURL: firebaseUser.photoURL,
      groupId: isFirstUser ? 'admin' : defaultGroupId,
      isSuperAdmin: isFirstUser,
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
      throw new Error('USER_NOT_FOUND');
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
      throw new Error('USER_NOT_FOUND');
    }

    const user = convertFirestoreDoc<User>(userDoc)!;

    // Prevent deleting super admins
    if (user.isSuperAdmin) {
      throw new Error('CANNOT_DELETE_SUPER_ADMIN');
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
      throw new Error('USER_NOT_FOUND');
    }

    const user = convertFirestoreDoc<User>(userDoc)!;

    if (user.isSuperAdmin) {
      throw new Error('CANNOT_DISABLE_SUPER_ADMIN');
    }

    if (user.status === 'disabled') {
      throw new Error('USER_ALREADY_DISABLED');
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
      throw new Error('USER_NOT_FOUND');
    }

    const user = convertFirestoreDoc<User>(userDoc)!;

    if (user.status === 'active') {
      throw new Error('USER_ALREADY_ACTIVE');
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
      throw new Error('GROUP_NOT_FOUND');
    }

    const userRef = this.db.collection(Collections.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error('USER_NOT_FOUND');
    }

    const user = convertFirestoreDoc<User>(userDoc)!;

    if (user.isSuperAdmin) {
      throw new Error('CANNOT_MODIFY_SUPER_ADMIN');
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
