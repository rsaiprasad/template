import {
  getDb,
  Collections,
  convertFirestoreDoc,
  convertFirestoreDocs,
} from '../lib/firebase-admin';
import type {
  Group,
  CreateGroupInput,
  UpdateGroupInput,
  User,
  Permission,
} from '@admin-dashboard/shared';
import { ADMIN_PERMISSIONS, USER_PERMISSIONS } from '@admin-dashboard/shared';
import { UserService } from './user.service';

/**
 * Group Service
 * Handles all group-related database operations
 */
export class GroupService {
  private db = getDb();
  private userService = new UserService();

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
    const snapshot = await this.db
      .collection(Collections.GROUPS)
      .orderBy('name', 'asc')
      .get();

    return convertFirestoreDocs<Group>(snapshot);
  }

  /**
   * List groups with user counts
   */
  async listGroupsWithUserCounts(): Promise<(Group & { userCount: number })[]> {
    const groups = await this.listGroups();

    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const userCount = await this.userService.countUsersByGroup(group.id);
        return { ...group, userCount };
      })
    );

    return groupsWithCounts;
  }

  /**
   * Create a new group
   */
  async createGroup(input: CreateGroupInput, creatorId: string): Promise<Group> {
    // Check if group with same name already exists
    const existingGroup = await this.getGroupByName(input.name);
    if (existingGroup) {
      throw new Error('GROUP_ALREADY_EXISTS');
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
      throw new Error('GROUP_NOT_FOUND');
    }

    const existingGroup = convertFirestoreDoc<Group>(groupDoc)!;

    // Check for name conflicts if name is being changed
    if (input.name && input.name !== existingGroup.name) {
      const conflictingGroup = await this.getGroupByName(input.name);
      if (conflictingGroup) {
        throw new Error('GROUP_NAME_CONFLICT');
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
      throw new Error('GROUP_NOT_FOUND');
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
      throw new Error('GROUP_NOT_FOUND');
    }

    const group = convertFirestoreDoc<Group>(groupDoc)!;

    // Prevent deleting system groups
    if (group.isSystem) {
      throw new Error('CANNOT_DELETE_SYSTEM_GROUP');
    }

    // Prevent deleting the default group
    if (group.isDefault) {
      throw new Error('CANNOT_DELETE_DEFAULT_GROUP');
    }

    // Check if group has any users
    const userCount = await this.userService.countUsersByGroup(groupId);
    if (userCount > 0) {
      throw new Error('GROUP_HAS_USERS');
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
      throw new Error('GROUP_NOT_FOUND');
    }

    return this.userService.getUsersByGroup(groupId);
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
        permissions: ADMIN_PERMISSIONS as unknown as string[],
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
        permissions: USER_PERMISSIONS as unknown as string[],
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
      throw new Error('GROUP_NOT_FOUND');
    }

    // Remove default flag from current default group
    const currentDefault = await this.db
      .collection(Collections.GROUPS)
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    const batch = this.db.batch();

    if (!currentDefault.empty) {
      batch.update(currentDefault.docs[0]!.ref, { isDefault: false });
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
