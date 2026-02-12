import type {
  CreateUserInput,
  Group,
  UpdateUserInput,
  User,
  UserSearchParams,
  UserWithPermissions,
} from '@admin-dashboard/shared';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { config } from '../config';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../core/errors';
import { getAuthAdmin } from '../core/lib/firebase-admin';
import { db } from '../db';
import { groups, settings, userGroups, users } from '../db/schema';

/**
 * Cursor-based pagination result
 */
export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Map a Drizzle user row + groupIds to the shared User type.
 */
function toUser(row: typeof users.$inferSelect, groupIds: string[]): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    photoURL: row.photoURL ?? null,
    status: row.status as 'active' | 'disabled',
    isSuperAdmin: row.isSuperAdmin,
    disabledAt: row.disabledAt ?? undefined,
    disabledBy: row.disabledBy ?? undefined,
    preferences: (row.preferences ?? { theme: 'system' }) as User['preferences'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt ?? new Date(),
    groupIds,
  };
}

/**
 * Fetch groupIds for a single user from the junction table.
 */
async function getUserGroupIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ groupId: userGroups.groupId })
    .from(userGroups)
    .where(eq(userGroups.userId, userId));
  return rows.map((r) => r.groupId);
}

/**
 * User Service
 * Handles all user-related database operations
 */
export class UserService {
  private auth = getAuthAdmin();

  /**
   * Get a user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (rows.length === 0) return null;

    const groupIds = await getUserGroupIds(userId);
    return toUser(rows[0]!, groupIds);
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0]!;
    const groupIds = await getUserGroupIds(row.id);
    return toUser(row, groupIds);
  }

  /**
   * Get a user with their permissions resolved
   */
  async getUserWithPermissions(userId: string): Promise<UserWithPermissions | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    // Fetch all groups for the user
    let userGroupRows: (typeof groups.$inferSelect)[] = [];
    if (user.groupIds.length > 0) {
      userGroupRows = await db
        .select()
        .from(groups)
        .where(inArray(groups.id, user.groupIds));
    }

    const permissionSet = new Set<string>();
    const groupNames: string[] = [];

    for (const group of userGroupRows) {
      groupNames.push(group.name);
      if (!user.isSuperAdmin) {
        for (const perm of group.permissions) {
          permissionSet.add(perm);
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
   */
  async listUsers(params: UserSearchParams & { cursor?: string } = {}): Promise<{
    users: User[];
    total: number;
    nextCursor: string | null;
  }> {
    const {
      page = 1,
      limit: limitParam = 20,
      status = 'all',
      groupId,
      query,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      cursor,
    } = params;

    // Build WHERE conditions
    const conditions: ReturnType<typeof eq>[] = [];

    if (status !== 'all') {
      conditions.push(eq(users.status, status));
    }

    // When filtering by groupId, we need to find user IDs in the junction table first
    let userIdsInGroup: string[] | null = null;
    if (groupId) {
      const groupUserRows = await db
        .select({ userId: userGroups.userId })
        .from(userGroups)
        .where(eq(userGroups.groupId, groupId));
      userIdsInGroup = groupUserRows.map((r) => r.userId);

      if (userIdsInGroup.length === 0) {
        // No users in this group
        return { users: [], total: 0, nextCursor: null };
      }
      conditions.push(inArray(users.id, userIdsInGroup));
    }

    // Search query — use ilike for case-insensitive matching on email and displayName
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(or(ilike(users.email, pattern), ilike(users.displayName, pattern))!);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;

    // Build sort expression
    const validSortFields = ['createdAt', 'updatedAt', 'displayName', 'email', 'lastLoginAt'] as const;
    type SortField = (typeof validSortFields)[number];
    const sortField: SortField = (validSortFields as readonly string[]).includes(sortBy)
      ? (sortBy as SortField)
      : 'createdAt';

    const sortColumnMap = {
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      displayName: users.displayName,
      email: users.email,
      lastLoginAt: users.lastLoginAt,
    } as const;

    const sortColumn = sortColumnMap[sortField];
    const orderExpr = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Build the main query
    let mainQuery = db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(orderExpr)
      .$dynamic();

    // Cursor-based pagination
    if (cursor) {
      // Fetch the cursor row to get its sort value
      const cursorRows = await db.select().from(users).where(eq(users.id, cursor)).limit(1);
      if (cursorRows.length > 0) {
        const cursorRow = cursorRows[0]!;
        const cursorValue = cursorRow[sortField];

        if (cursorValue !== null && cursorValue !== undefined) {
          // For desc order: fetch rows where sortField < cursorValue
          // For asc order: fetch rows where sortField > cursorValue
          const cursorCondition =
            sortOrder === 'asc'
              ? sql`${sortColumn} > ${cursorValue}`
              : sql`${sortColumn} < ${cursorValue}`;

          const allConditions = whereClause
            ? and(whereClause, cursorCondition)
            : cursorCondition;

          mainQuery = db
            .select()
            .from(users)
            .where(allConditions)
            .orderBy(orderExpr)
            .$dynamic();
        }
      }
    } else if (page > 1) {
      // Fallback to offset-based pagination for backwards compatibility
      const offset = (page - 1) * limitParam;
      mainQuery = mainQuery.offset(offset);
    }

    // Fetch one extra to determine hasMore
    const rows = await mainQuery.limit(limitParam + 1);

    const hasMore = rows.length > limitParam;
    const resultRows = hasMore ? rows.slice(0, limitParam) : rows;

    // Fetch groupIds for all returned users in a single query
    const userIds = resultRows.map((r) => r.id);
    let groupIdsByUser: Map<string, string[]> = new Map();
    if (userIds.length > 0) {
      const groupRows = await db
        .select({ userId: userGroups.userId, groupId: userGroups.groupId })
        .from(userGroups)
        .where(inArray(userGroups.userId, userIds));

      for (const gr of groupRows) {
        const existing = groupIdsByUser.get(gr.userId) ?? [];
        existing.push(gr.groupId);
        groupIdsByUser.set(gr.userId, existing);
      }
    }

    const resultUsers = resultRows.map((row) => toUser(row, groupIdsByUser.get(row.id) ?? []));

    const nextCursor = hasMore && resultUsers.length > 0 ? resultUsers[resultUsers.length - 1]!.id : null;

    return { users: resultUsers, total, nextCursor };
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
      const settingsRows = await db.select().from(settings).where(eq(settings.id, 'app')).limit(1);
      const defaultGroupId = settingsRows.length > 0 ? settingsRows[0]!.defaultGroupId : 'users';
      groupIds = [defaultGroupId];
    }

    const now = new Date();
    const userId = crypto.randomUUID();

    const newUser = {
      id: userId,
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      photoURL: input.photoURL || null,
      isSuperAdmin: false,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      preferences: { theme: 'system' as const },
    };

    await db.transaction(async (tx) => {
      await tx.insert(users).values(newUser);

      if (groupIds!.length > 0) {
        await tx.insert(userGroups).values(
          groupIds!.map((gid) => ({ userId, groupId: gid }))
        );
      }
    });

    return toUser({ ...newUser, disabledAt: null, disabledBy: null }, groupIds!);
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
    const now = new Date();

    // Check if user already exists by UID or email
    const [existingById] = await db
      .select()
      .from(users)
      .where(eq(users.id, firebaseUser.uid))
      .limit(1);

    const [existingByEmail] = !existingById
      ? await db
          .select()
          .from(users)
          .where(eq(users.email, firebaseUser.email.toLowerCase()))
          .limit(1)
      : [undefined];

    const existingUser = existingById || existingByEmail;

    if (existingUser) {
      const oldId = existingUser.id;
      const newId = firebaseUser.uid;
      const idChanged = oldId !== newId;

      const shouldBeSuperAdmin = !!(
        config.superAdminEmail && firebaseUser.email.toLowerCase() === config.superAdminEmail
      );

      await db.transaction(async (tx) => {
        if (idChanged) {
          // UID changed (e.g. auth emulator restart) — migrate FK references first
          await tx.delete(userGroups).where(eq(userGroups.userId, oldId));
          await tx.update(users).set({ id: newId }).where(eq(users.id, oldId));
        }

        // Update user fields
        const updates: Record<string, unknown> = {
          lastLoginAt: now,
          updatedAt: now,
        };

        if (firebaseUser.displayName) {
          if (!existingUser.displayName || existingUser.displayName === existingUser.email) {
            updates.displayName = firebaseUser.displayName;
          }
        }
        if (firebaseUser.photoURL) {
          updates.photoURL = firebaseUser.photoURL;
        }
        if (shouldBeSuperAdmin !== existingUser.isSuperAdmin) {
          updates.isSuperAdmin = shouldBeSuperAdmin;
        }

        await tx.update(users).set(updates).where(eq(users.id, newId));

        // Re-create group memberships if UID changed
        if (idChanged) {
          const groupIds = shouldBeSuperAdmin ? ['admin'] : ['users'];
          await tx.insert(userGroups).values(
            groupIds.map((gid) => ({ userId: newId, groupId: gid }))
          ).onConflictDoNothing();
        }

        // Ensure super admin is in admin group
        if (shouldBeSuperAdmin) {
          await tx
            .insert(userGroups)
            .values({ userId: newId, groupId: 'admin' })
            .onConflictDoNothing();
        }
      });

      // Re-fetch updated user
      const [updatedRow] = await db
        .select()
        .from(users)
        .where(eq(users.id, newId))
        .limit(1);
      const updatedGroupIds = await getUserGroupIds(newId);
      return toUser(updatedRow!, updatedGroupIds);
    }

    // --- New user ---

    // Get default group for new users
    const [settingsRow] = await db.select().from(settings).where(eq(settings.id, 'app')).limit(1);
    const defaultGroupId = settingsRow?.defaultGroupId ?? 'users';

    const isSuperAdmin = !!(
      config.superAdminEmail && firebaseUser.email.toLowerCase() === config.superAdminEmail
    );

    const assignedGroupIds = isSuperAdmin ? ['admin'] : [defaultGroupId];

    const newUserRow = {
      id: firebaseUser.uid,
      email: firebaseUser.email.toLowerCase(),
      displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User',
      photoURL: firebaseUser.photoURL,
      isSuperAdmin,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      preferences: { theme: 'system' as const },
    };

    await db.transaction(async (tx) => {
      await tx.insert(users).values(newUserRow);
      await tx.insert(userGroups).values(
        assignedGroupIds.map((gid) => ({ userId: firebaseUser.uid, groupId: gid }))
      );
    });

    return toUser({ ...newUserRow, disabledAt: null, disabledBy: null }, assignedGroupIds);
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, input: UpdateUserInput, actorId?: string): Promise<User> {
    const existingRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (existingRows.length === 0) {
      throw new NotFoundError('User');
    }

    const existingRow = existingRows[0]!;
    const existingGroupIds = await getUserGroupIds(userId);
    const existingUser = toUser(existingRow, existingGroupIds);

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
      if (input.groupIds.length > 0) {
        const existingGroups = await db
          .select({ id: groups.id })
          .from(groups)
          .where(inArray(groups.id, input.groupIds));

        const foundIds = new Set(existingGroups.map((g) => g.id));
        for (const gid of input.groupIds) {
          if (!foundIds.has(gid)) {
            throw new ValidationError(`Group "${gid}" not found`);
          }
        }
      }

      // Replace all group memberships in a transaction
      await db.transaction(async (tx) => {
        // Remove all existing group memberships
        await tx.delete(userGroups).where(eq(userGroups.userId, userId));

        // Insert new group memberships
        if (input.groupIds!.length > 0) {
          await tx.insert(userGroups).values(
            input.groupIds!.map((gid) => ({ userId, groupId: gid }))
          );
        }
      });
    }

    await db.update(users).set(updates).where(eq(users.id, userId));

    // Build the updated user from the merged data
    const finalGroupIds = input.groupIds !== undefined ? input.groupIds : existingGroupIds;
    return { ...existingUser, ...updates, groupIds: finalGroupIds } as User;
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<void> {
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (rows.length === 0) {
      throw new NotFoundError('User');
    }

    const row = rows[0]!;
    const groupIds = await getUserGroupIds(userId);
    const user = toUser(row, groupIds);

    // Prevent deleting super admins
    if (user.isSuperAdmin) {
      throw new ForbiddenError('Cannot delete super administrator accounts');
    }

    // Delete from database (cascade will remove user_groups entries)
    await db.delete(users).where(eq(users.id, userId));

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
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (rows.length === 0) {
      throw new NotFoundError('User');
    }

    const row = rows[0]!;
    const groupIds = await getUserGroupIds(userId);
    const user = toUser(row, groupIds);

    if (user.isSuperAdmin) {
      throw new ForbiddenError('Cannot disable super administrator accounts');
    }

    if (user.status === 'disabled') {
      throw new ValidationError('User is already disabled');
    }

    const now = new Date();
    const updates = {
      status: 'disabled' as const,
      disabledAt: now,
      disabledBy,
      updatedAt: now,
    };

    await db.update(users).set(updates).where(eq(users.id, userId));

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
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (rows.length === 0) {
      throw new NotFoundError('User');
    }

    const row = rows[0]!;
    const groupIds = await getUserGroupIds(userId);
    const user = toUser(row, groupIds);

    if (user.status === 'active') {
      throw new ValidationError('User is already active');
    }

    const updates = {
      status: 'active' as const,
      disabledAt: null,
      disabledBy: null,
      updatedAt: new Date(),
    };

    await db.update(users).set(updates).where(eq(users.id, userId));

    // Also enable in Firebase Auth
    try {
      await this.auth.updateUser(userId, { disabled: false });
    } catch (error) {
      console.warn(`Could not enable user ${userId} in Firebase Auth:`, error);
    }

    return {
      ...user,
      status: 'active',
      disabledAt: undefined,
      disabledBy: undefined,
      updatedAt: updates.updatedAt,
    };
  }

  /**
   * Add a user to a group
   */
  async addUserToGroup(userId: string, groupId: string): Promise<User> {
    return db.transaction(async (tx) => {
      // Check group exists
      const groupRows = await tx.select().from(groups).where(eq(groups.id, groupId)).limit(1);
      if (groupRows.length === 0) {
        throw new NotFoundError('Group');
      }

      // Check user exists
      const userRows = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userRows.length === 0) {
        throw new NotFoundError('User');
      }

      const userRow = userRows[0]!;
      const existingGroupIds = (
        await tx
          .select({ groupId: userGroups.groupId })
          .from(userGroups)
          .where(eq(userGroups.userId, userId))
      ).map((r) => r.groupId);

      const user = toUser(userRow, existingGroupIds);

      if (user.isSuperAdmin) {
        throw new ForbiddenError('Cannot modify super administrator accounts');
      }

      if (existingGroupIds.includes(groupId)) {
        throw new ValidationError('User is already in this group');
      }

      const now = new Date();
      await tx.insert(userGroups).values({ userId, groupId });
      await tx.update(users).set({ updatedAt: now }).where(eq(users.id, userId));

      const newGroupIds = [...existingGroupIds, groupId];
      return { ...user, groupIds: newGroupIds, updatedAt: now };
    });
  }

  /**
   * Remove a user from a group
   */
  async removeUserFromGroup(userId: string, groupId: string): Promise<User> {
    return db.transaction(async (tx) => {
      // Check user exists
      const userRows = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userRows.length === 0) {
        throw new NotFoundError('User');
      }

      const userRow = userRows[0]!;
      const existingGroupIds = (
        await tx
          .select({ groupId: userGroups.groupId })
          .from(userGroups)
          .where(eq(userGroups.userId, userId))
      ).map((r) => r.groupId);

      const user = toUser(userRow, existingGroupIds);

      if (user.isSuperAdmin) {
        throw new ForbiddenError('Cannot modify super administrator accounts');
      }

      if (!existingGroupIds.includes(groupId)) {
        throw new ValidationError('User is not in this group');
      }

      if (existingGroupIds.length <= 1) {
        throw new ValidationError(
          'Cannot remove the last group. Users must belong to at least one group.'
        );
      }

      const now = new Date();
      await tx
        .delete(userGroups)
        .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)));
      await tx.update(users).set({ updatedAt: now }).where(eq(users.id, userId));

      const newGroupIds = existingGroupIds.filter((gid) => gid !== groupId);
      return { ...user, groupIds: newGroupIds, updatedAt: now };
    });
  }

  /**
   * Get users by group ID
   */
  async getUsersByGroup(groupId: string): Promise<User[]> {
    // Get all user IDs in this group
    const groupUserRows = await db
      .select({ userId: userGroups.userId })
      .from(userGroups)
      .where(eq(userGroups.groupId, groupId));

    if (groupUserRows.length === 0) return [];

    const userIds = groupUserRows.map((r) => r.userId);

    // Fetch all users
    const userRows = await db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));

    // Fetch all group memberships for these users
    const allGroupRows = await db
      .select({ userId: userGroups.userId, groupId: userGroups.groupId })
      .from(userGroups)
      .where(inArray(userGroups.userId, userIds));

    const groupIdsByUser = new Map<string, string[]>();
    for (const gr of allGroupRows) {
      const existing = groupIdsByUser.get(gr.userId) ?? [];
      existing.push(gr.groupId);
      groupIdsByUser.set(gr.userId, existing);
    }

    return userRows.map((row) => toUser(row, groupIdsByUser.get(row.id) ?? []));
  }

  /**
   * Count users by group ID
   */
  async countUsersByGroup(groupId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(userGroups)
      .where(eq(userGroups.groupId, groupId));

    return result[0]?.count ?? 0;
  }
}
