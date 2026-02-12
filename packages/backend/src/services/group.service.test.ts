import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createChainMock, resetDbMocks } from '../__tests__/setup';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../core/errors';

// Must declare vi.mock in the same file that imports the module (Bun requirement)
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { db } from '../db';
import { GroupService } from './group.service';

const mockDb = db as any;

function makeGroupRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'group-1',
    name: 'Test Group',
    description: 'A test group',
    permissions: ['users:read'],
    isDefault: false,
    isSystem: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'system',
    updatedBy: 'system',
    ...overrides,
  };
}

function makeUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    status: 'active',
    isSuperAdmin: false,
    disabledAt: null,
    disabledBy: null,
    preferences: { theme: 'system' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('GroupService', () => {
  let service: GroupService;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks(mockDb);
    service = new GroupService();
  });

  describe('getGroup', () => {
    it('should return group when found', async () => {
      const row = makeGroupRow();
      mockDb.select.mockReturnValue(createChainMock([row]));

      const group = await service.getGroup('group-1');
      expect(group).toBeTruthy();
      expect(group?.name).toBe('Test Group');
    });

    it('should return null when group not found', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      const group = await service.getGroup('group-1');
      expect(group).toBeNull();
    });
  });

  describe('getGroupByName', () => {
    it('should return group matching name', async () => {
      const row = makeGroupRow({ name: 'Admins' });
      mockDb.select.mockReturnValue(createChainMock([row]));

      const group = await service.getGroupByName('Admins');
      expect(group?.name).toBe('Admins');
    });

    it('should return null when no match', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      const group = await service.getGroupByName('Nonexistent');
      expect(group).toBeNull();
    });
  });

  describe('createGroup', () => {
    it('should create a new group', async () => {
      const createdRow = makeGroupRow({ name: 'New Group', description: 'Desc' });

      // getGroupByName returns empty (no conflict)
      // Then insert returns the created row
      mockDb.select.mockReturnValue(createChainMock([]));
      mockDb.insert.mockReturnValue(createChainMock([createdRow]));

      const group = await service.createGroup(
        { name: 'New Group', description: 'Desc', permissions: ['users:read'] },
        'creator-1'
      );

      expect(group.name).toBe('New Group');
      expect(group.isDefault).toBe(false);
      expect(group.isSystem).toBe(false);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw ConflictError if name already exists', async () => {
      const existingRow = makeGroupRow();
      // getGroupByName returns existing group
      mockDb.select.mockReturnValue(createChainMock([existingRow]));

      await expect(
        service.createGroup({ name: 'Test Group', description: '' }, 'creator')
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateGroup', () => {
    it('should update group name and description', async () => {
      const existingRow = makeGroupRow();
      const updatedRow = makeGroupRow({ name: 'Updated Name' });

      // First select: getGroup returns existing
      // Second select: getGroupByName returns empty (no conflict)
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createChainMock([existingRow]);
        }
        // Name conflict check - no conflict
        return createChainMock([]);
      });

      mockDb.update.mockReturnValue(createChainMock([updatedRow]));

      const updated = await service.updateGroup('group-1', { name: 'Updated Name' }, 'updater-1');
      expect(updated.name).toBe('Updated Name');
    });

    it('should throw NotFoundError if group missing', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      await expect(service.updateGroup('group-1', { name: 'New' }, 'updater')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ConflictError if renaming to existing name', async () => {
      const existingRow = makeGroupRow({ name: 'Old Name' });
      const conflictRow = makeGroupRow({ id: 'other', name: 'Taken' });

      // First select: getGroup returns existing
      // Second select: getGroupByName returns a conflict
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createChainMock([existingRow]);
        }
        return createChainMock([conflictRow]);
      });

      await expect(service.updateGroup('group-1', { name: 'Taken' }, 'updater')).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('deleteGroup', () => {
    it('should delete a non-system, non-default group with no users', async () => {
      const groupRow = makeGroupRow({ isSystem: false, isDefault: false });

      // First select: getGroup returns the group
      // Second select: user count query returns 0
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createChainMock([groupRow]);
        }
        // count query from userGroups
        return createChainMock([{ count: 0 }]);
      });

      mockDb.delete.mockReturnValue(createChainMock([]));

      await service.deleteGroup('group-1');
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenError for system groups', async () => {
      const groupRow = makeGroupRow({ isSystem: true });
      mockDb.select.mockReturnValue(createChainMock([groupRow]));

      await expect(service.deleteGroup('admin')).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for default group', async () => {
      const groupRow = makeGroupRow({ isDefault: true });
      mockDb.select.mockReturnValue(createChainMock([groupRow]));

      await expect(service.deleteGroup('users')).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError if group has users', async () => {
      const groupRow = makeGroupRow();

      // First select: getGroup
      // Second select: count query returns 3
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createChainMock([groupRow]);
        }
        return createChainMock([{ count: 3 }]);
      });

      await expect(service.deleteGroup('group-1')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if group missing', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      await expect(service.deleteGroup('group-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateGroupPermissions', () => {
    it('should update permissions for a group', async () => {
      const existingRow = makeGroupRow({ permissions: ['users:read'] });
      const updatedRow = makeGroupRow({ permissions: ['users:read', 'users:update'] });

      // getGroup returns the existing group
      mockDb.select.mockReturnValue(createChainMock([existingRow]));
      mockDb.update.mockReturnValue(createChainMock([updatedRow]));

      const updated = await service.updateGroupPermissions(
        'group-1',
        ['users:read', 'users:update'] as any,
        'updater'
      );
      expect(updated.permissions).toEqual(['users:read', 'users:update']);
    });

    it('should throw NotFoundError if group missing', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      await expect(
        service.updateGroupPermissions('group-1', [] as any, 'updater')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getGroupUsers', () => {
    it('should return users in the group', async () => {
      const groupRow = makeGroupRow();
      const userRow = makeUserRow({ id: 'u1', email: 'a@b.com' });

      // First select: getGroup (verifies group exists)
      // Second select: inner join query for users in group
      // Third select: fetchGroupIdsForUsers
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createChainMock([groupRow]);
        }
        if (selectCallCount === 2) {
          // The inner join query returns {user: userRow}
          return createChainMock([{ user: userRow }]);
        }
        // fetchGroupIdsForUsers returns group memberships
        return createChainMock([{ userId: 'u1', groupId: 'group-1' }]);
      });

      const users = await service.getGroupUsers('group-1');
      expect(users.length).toBe(1);
    });

    it('should throw NotFoundError if group does not exist', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      await expect(service.getGroupUsers('group-1')).rejects.toThrow(NotFoundError);
    });
  });
});
