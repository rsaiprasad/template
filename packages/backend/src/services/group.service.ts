import type {
  CreateGroupInput,
  Group,
  Permission,
  UpdateGroupInput,
  User,
} from '@admin-dashboard/shared';
import { ADMIN_PERMISSIONS, USER_PERMISSIONS } from '@admin-dashboard/shared';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../core/errors';
import {
  Collections,
  convertFirestoreDoc,
  convertFirestoreDocs,
  getDb,
} from '../core/lib/firebase-admin';

/**
 * Group Service
 * Handles all group-related database operations
 */
export class GroupService {
  private db = getDb();

  /**
   * Get a group by ID
   */
  async getGroup(groupId: string): Promise<Group | null> {
    const doc = await this.db.collection(Collections.GROUPS).doc(groupId).get();
    return convertFirestoreDoc<Group>(doc);
  }

  /**
   * Get a group by name
   */
  async getGroupByName(name: string): Promise<Group | null> {
    const snapshot = await this.db
      .collection(Collections.GROUPS)
      .where('name', '==', name)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return convertFirestoreDoc<Group>(snapshot.docs[0]!);
  }

  /**
   * List all groups
   */
  async listGroups(): Promise<Group[]> {
    const snapshot = await this.db.collection(Collections.GROUPS).orderBy('name', 'asc').get();

    return convertFirestoreDocs<Group>(snapshot);
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

    let ref = this.db.collection(Collections.GROUPS) as FirebaseFirestore.Query;

    if (params.query) {
      ref = ref
        .where('name', '>=', params.query)
        .where('name', '<', `${params.query}\uf8ff`);
    }

    // Get total count
    const countSnapshot = await ref.count().get();
    const total = countSnapshot.data().count;

    // Apply sorting and pagination
    // When searching with name prefix (inequality filters on name),
    // Firestore requires orderBy on the inequality field only — adding a
    // secondary orderBy on a different field requires a composite index.
    if (params.query) {
      ref = ref.orderBy('name', 'asc');
    } else {
      ref = ref.orderBy(sortBy, sortOrder);
    }
    const offset = (page - 1) * limit;
    if (offset > 0) {
      ref = ref.offset(offset);
    }
    ref = ref.limit(limit);

    const snapshot = await ref.get();
    const groups = convertFirestoreDocs<Group>(snapshot);

    return { groups, total };
  }

  /**
   * List groups with user counts
   * Fixed N+1 query by doing a single aggregation query for all group counts
   */
  async listGroupsWithUserCounts(): Promise<(Group & { userCount: number })[]> {
    const groups = await this.listGroups();

    // Get all users and count by group in a single query
    // This avoids N+1 queries by fetching all user group counts at once
    const usersSnapshot = await this.db.collection(Collections.USERS).select('groupId').get();

    // Count users per group
    const groupCounts = new Map<string, number>();
    for (const doc of usersSnapshot.docs) {
      const groupId = doc.data().groupId as string;
      groupCounts.set(groupId, (groupCounts.get(groupId) || 0) + 1);
    }

    // Merge counts with groups
    return groups.map((group) => ({
      ...group,
      userCount: groupCounts.get(group.id) || 0,
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
    const groupId = this.db.collection(Collections.GROUPS).doc().id;

    const group: Omit<Group, 'id'> = {
      name: input.name,
      description: input.description,
      permissions: input.permissions || [],
      isDefault: false,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
      createdBy: creatorId,
      updatedBy: creatorId,
    };

    await this.db.collection(Collections.GROUPS).doc(groupId).set(group);

    return { id: groupId, ...group };
  }

  /**
   * Update a group
   */
  async updateGroup(groupId: string, input: UpdateGroupInput, updaterId: string): Promise<Group> {
    const groupRef = this.db.collection(Collections.GROUPS).doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      throw new NotFoundError('Group');
    }

    const existingGroup = convertFirestoreDoc<Group>(groupDoc)!;

    // Check for name conflicts if name is being changed
    if (input.name && input.name !== existingGroup.name) {
      const conflictingGroup = await this.getGroupByName(input.name);
      if (conflictingGroup) {
        throw new ConflictError('A group with this name already exists');
      }
    }

    const updates: Partial<Group> = {
      ...input,
      updatedAt: new Date(),
      updatedBy: updaterId,
    };

    await groupRef.update(updates);

    return { ...existingGroup, ...updates };
  }

  /**
   * Update group permissions
   */
  async updateGroupPermissions(
    groupId: string,
    permissions: Permission[],
    updaterId: string
  ): Promise<Group> {
    const groupRef = this.db.collection(Collections.GROUPS).doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      throw new NotFoundError('Group');
    }

    const existingGroup = convertFirestoreDoc<Group>(groupDoc)!;

    const updates: Partial<Group> = {
      permissions,
      updatedAt: new Date(),
      updatedBy: updaterId,
    };

    await groupRef.update(updates);

    return { ...existingGroup, ...updates };
  }

  /**
   * Delete a group
   */
  async deleteGroup(groupId: string): Promise<void> {
    const groupRef = this.db.collection(Collections.GROUPS).doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      throw new NotFoundError('Group');
    }

    const group = convertFirestoreDoc<Group>(groupDoc)!;

    // Prevent deleting system groups
    if (group.isSystem) {
      throw new ForbiddenError('Cannot delete system groups');
    }

    // Prevent deleting the default group
    if (group.isDefault) {
      throw new ForbiddenError('Cannot delete the default group');
    }

    // Check if group has any users
    const userCountSnapshot = await this.db
      .collection(Collections.USERS)
      .where('groupId', '==', groupId)
      .count()
      .get();
    const userCount = userCountSnapshot.data().count;

    if (userCount > 0) {
      throw new ValidationError('Cannot delete a group that has users. Please move users to another group first.');
    }

    await groupRef.delete();
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

    const snapshot = await this.db
      .collection(Collections.USERS)
      .where('groupId', '==', groupId)
      .get();

    return convertFirestoreDocs<User>(snapshot);
  }

  /**
   * Initialize default groups
   * Creates the admin and users groups if they don't exist
   */
  async initializeDefaultGroups(): Promise<void> {
    const batch = this.db.batch();
    const now = new Date();

    // Admin group
    const adminRef = this.db.collection(Collections.GROUPS).doc('admin');
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists) {
      const adminGroup: Omit<Group, 'id'> = {
        name: 'Administrators',
        description: 'Full access to all system features',
        permissions: [...ADMIN_PERMISSIONS],
        isDefault: false,
        isSystem: true,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system',
      };
      batch.set(adminRef, adminGroup);
    }

    // Users group
    const usersRef = this.db.collection(Collections.GROUPS).doc('users');
    const usersDoc = await usersRef.get();

    if (!usersDoc.exists) {
      const usersGroup: Omit<Group, 'id'> = {
        name: 'Users',
        description: 'Standard user access',
        permissions: [...USER_PERMISSIONS],
        isDefault: true,
        isSystem: true,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system',
      };
      batch.set(usersRef, usersGroup);
    }

    await batch.commit();
  }

  /**
   * Set a group as the default group
   */
  async setDefaultGroup(groupId: string, updaterId: string): Promise<Group> {
    const groupRef = this.db.collection(Collections.GROUPS).doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      throw new NotFoundError('Group');
    }

    // Remove default flag from current default group
    const currentDefault = await this.db
      .collection(Collections.GROUPS)
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    const batch = this.db.batch();

    if (!currentDefault.empty && currentDefault.docs[0]) {
      batch.update(currentDefault.docs[0].ref, { isDefault: false });
    }

    // Set new default
    batch.update(groupRef, {
      isDefault: true,
      updatedAt: new Date(),
      updatedBy: updaterId,
    });

    await batch.commit();

    // Also update settings
    await this.db.collection(Collections.SETTINGS).doc('app').update({
      defaultGroupId: groupId,
      updatedAt: new Date(),
      updatedBy: updaterId,
    });

    const updatedDoc = await groupRef.get();
    return convertFirestoreDoc<Group>(updatedDoc)!;
  }
}
