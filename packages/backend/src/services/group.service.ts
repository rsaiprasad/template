import type {
  CreateGroupInput,
  Group,
  Permission,
  UpdateGroupInput,
  User,
} from '@admin-dashboard/shared';
import { and, asc, count, desc, eq, ilike, sql } from 'drizzle-orm';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../core/errors';
import { getAdminPermissions, getUserPermissions } from '../core/permissions';
import { db } from '../db';
import { groups, settings, userGroups, users } from '../db/schema';

/**
 * Helper: convert a Drizzle groups row to the shared Group type.
 * Drizzle returns `permissions` as `string[]`; we cast to `Permission[]`.
 */
function toGroup(row: typeof groups.$inferSelect): Group {
  return {
    ...row,
    permissions: row.permissions as Permission[],
  };
}

/**
 * Helper: given an array of user IDs, fetch all groupIds per user from the
 * junction table and return a Map<userId, groupId[]>.
 */
async function fetchGroupIdsForUsers(userIds: string[]): Promise<Map<string, string[]>> {
  if (userIds.length === 0) return new Map();

  const rows = await db
    .select({ userId: userGroups.userId, groupId: userGroups.groupId })
    .from(userGroups)
    .where(sql`${userGroups.userId} = ANY(${userIds})`);

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const existing = map.get(row.userId);
    if (existing) {
      existing.push(row.groupId);
    } else {
      map.set(row.userId, [row.groupId]);
    }
  }
  return map;
}

/**
 * Helper: convert a Drizzle users row + groupIds into the shared User type.
 */
function toUser(row: typeof users.$inferSelect, groupIds: string[]): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    photoURL: row.photoURL ?? null,
    groupIds,
    isSuperAdmin: row.isSuperAdmin,
    status: row.status as User['status'],
    disabledAt: row.disabledAt ?? undefined,
    disabledBy: row.disabledBy ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt ?? row.createdAt,
    preferences: (row.preferences as User['preferences']) ?? { theme: 'system' },
  };
}

/**
 * Group Service
 * Handles all group-related database operations
 */
export class GroupService {
  /**
   * Get a group by ID
   */
  async getGroup(groupId: string): Promise<Group | null> {
    const rows = await db.select().from(groups).where(eq(groups.id, groupId));
    return rows[0] ? toGroup(rows[0]) : null;
  }

  /**
   * Get a group by name
   */
  async getGroupByName(name: string): Promise<Group | null> {
    const rows = await db.select().from(groups).where(eq(groups.name, name)).limit(1);
    return rows[0] ? toGroup(rows[0]) : null;
  }

  /**
   * List all groups
   */
  async listGroups(): Promise<Group[]> {
    const rows = await db.select().from(groups).orderBy(asc(groups.name));
    return rows.map(toGroup);
  }

  /**
   * Search groups with pagination
   */
  async searchGroups(params: {
    page?: number;
    limit?: number;
    query?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ groups: Group[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const sortBy = params.sortBy || 'name';
    const sortOrder = params.sortOrder || 'asc';
    const offset = (page - 1) * limit;

    // Build where condition
    const whereCondition = params.query
      ? ilike(groups.name, `%${params.query}%`)
      : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(groups)
      .where(whereCondition);
    const total = countResult?.count ?? 0;

    // Resolve sort column (default to name)
    const sortColumn =
      sortBy === 'createdAt'
        ? groups.createdAt
        : sortBy === 'updatedAt'
          ? groups.updatedAt
          : groups.name;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    // Fetch page of groups
    const rows = await db
      .select()
      .from(groups)
      .where(whereCondition)
      .orderBy(orderFn(sortColumn))
      .offset(offset)
      .limit(limit);

    const groupResults = rows.map(toGroup);

    // Get user counts per group from the junction table
    const counts = await db
      .select({ groupId: userGroups.groupId, count: count() })
      .from(userGroups)
      .groupBy(userGroups.groupId);
    const countMap = new Map(counts.map((c) => [c.groupId, c.count]));

    return {
      groups: groupResults.map((g) => ({ ...g, userCount: countMap.get(g.id) || 0 })),
      total,
    };
  }

  /**
   * List groups with user counts
   * Uses junction table for efficient counting
   */
  async listGroupsWithUserCounts(): Promise<(Group & { userCount: number })[]> {
    const allGroups = await this.listGroups();

    // Get user counts per group from the junction table
    const counts = await db
      .select({ groupId: userGroups.groupId, count: count() })
      .from(userGroups)
      .groupBy(userGroups.groupId);
    const countMap = new Map(counts.map((c) => [c.groupId, c.count]));

    return allGroups.map((group) => ({
      ...group,
      userCount: countMap.get(group.id) || 0,
    }));
  }

  /**
   * Create a new group
   */
  async createGroup(input: CreateGroupInput, creatorId: string): Promise<Group> {
    // Check if group with same name already exists
    const existingGroup = await this.getGroupByName(input.name);
    if (existingGroup) {
      throw new ConflictError('A group with this name already exists');
    }

    const now = new Date();
    const groupId = crypto.randomUUID();

    const [created] = await db
      .insert(groups)
      .values({
        id: groupId,
        name: input.name,
        description: input.description,
        permissions: (input.permissions as string[]) || [],
        isDefault: false,
        isSystem: false,
        createdAt: now,
        updatedAt: now,
        createdBy: creatorId,
        updatedBy: creatorId,
      })
      .returning();

    return toGroup(created!);
  }

  /**
   * Update a group
   */
  async updateGroup(groupId: string, input: UpdateGroupInput, updaterId: string): Promise<Group> {
    const existingGroup = await this.getGroup(groupId);
    if (!existingGroup) {
      throw new NotFoundError('Group');
    }

    // Check for name conflicts if name is being changed
    if (input.name && input.name !== existingGroup.name) {
      const conflictingGroup = await this.getGroupByName(input.name);
      if (conflictingGroup) {
        throw new ConflictError('A group with this name already exists');
      }
    }

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: updaterId,
    };
    if (input.name !== undefined) updateValues.name = input.name;
    if (input.description !== undefined) updateValues.description = input.description;
    if (input.permissions !== undefined) updateValues.permissions = input.permissions as string[];

    const [updated] = await db
      .update(groups)
      .set(updateValues)
      .where(eq(groups.id, groupId))
      .returning();

    return toGroup(updated!);
  }

  /**
   * Update group permissions
   */
  async updateGroupPermissions(
    groupId: string,
    permissions: Permission[],
    updaterId: string
  ): Promise<Group> {
    const existingGroup = await this.getGroup(groupId);
    if (!existingGroup) {
      throw new NotFoundError('Group');
    }

    const [updated] = await db
      .update(groups)
      .set({
        permissions: permissions as string[],
        updatedAt: new Date(),
        updatedBy: updaterId,
      })
      .where(eq(groups.id, groupId))
      .returning();

    return toGroup(updated!);
  }

  /**
   * Delete a group
   */
  async deleteGroup(groupId: string): Promise<void> {
    const group = await this.getGroup(groupId);
    if (!group) {
      throw new NotFoundError('Group');
    }

    // Prevent deleting system groups
    if (group.isSystem) {
      throw new ForbiddenError('Cannot delete system groups');
    }

    // Prevent deleting the default group
    if (group.isDefault) {
      throw new ForbiddenError('Cannot delete the default group');
    }

    // Check if group has any users via the junction table
    const [userCountResult] = await db
      .select({ count: count() })
      .from(userGroups)
      .where(eq(userGroups.groupId, groupId));
    const userCount = userCountResult?.count ?? 0;

    if (userCount > 0) {
      throw new ValidationError(
        'Cannot delete a group that has users. Please remove users from this group first.'
      );
    }

    await db.delete(groups).where(eq(groups.id, groupId));
  }

  /**
   * Get users in a group
   */
  async getGroupUsers(groupId: string): Promise<User[]> {
    // Verify group exists
    const group = await this.getGroup(groupId);
    if (!group) {
      throw new NotFoundError('Group');
    }

    // Get users that belong to this group via the junction table
    const rows = await db
      .select({ user: users })
      .from(users)
      .innerJoin(userGroups, eq(users.id, userGroups.userId))
      .where(eq(userGroups.groupId, groupId));

    if (rows.length === 0) return [];

    // Fetch all groupIds for the returned users
    const userIds = rows.map((r) => r.user.id);
    const groupIdsMap = await fetchGroupIdsForUsers(userIds);

    return rows.map((r) => toUser(r.user, groupIdsMap.get(r.user.id) || []));
  }

  /**
   * Initialize default groups
   * Creates the admin and users groups if they don't exist
   */
  async initializeDefaultGroups(): Promise<void> {
    const now = new Date();

    // Admin group - upsert with onConflictDoNothing for idempotency
    await db
      .insert(groups)
      .values({
        id: 'admin',
        name: 'Administrators',
        description: 'Full access to all system features',
        permissions: [...getAdminPermissions()] as string[],
        isDefault: false,
        isSystem: true,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system',
      })
      .onConflictDoNothing();

    // Users group - upsert with onConflictDoNothing for idempotency
    await db
      .insert(groups)
      .values({
        id: 'users',
        name: 'Users',
        description: 'Standard user access',
        permissions: [...getUserPermissions()] as string[],
        isDefault: true,
        isSystem: true,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system',
      })
      .onConflictDoNothing();
  }

  /**
   * Set a group as the default group
   */
  async setDefaultGroup(groupId: string, updaterId: string): Promise<Group> {
    const existingGroup = await this.getGroup(groupId);
    if (!existingGroup) {
      throw new NotFoundError('Group');
    }

    await db.transaction(async (tx) => {
      // Remove default flag from all current default groups
      await tx
        .update(groups)
        .set({ isDefault: false })
        .where(eq(groups.isDefault, true));

      // Set new default
      await tx
        .update(groups)
        .set({
          isDefault: true,
          updatedAt: new Date(),
          updatedBy: updaterId,
        })
        .where(eq(groups.id, groupId));

      // Also update settings
      await tx
        .update(settings)
        .set({
          defaultGroupId: groupId,
          updatedAt: new Date(),
          updatedBy: updaterId,
        })
        .where(eq(settings.id, 'app'));
    });

    // Fetch and return the updated group
    const updatedGroup = await this.getGroup(groupId);
    return updatedGroup!;
  }
}
