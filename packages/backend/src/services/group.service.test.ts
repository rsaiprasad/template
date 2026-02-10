import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { mockDocSnapshot, mockQuerySnapshot } from '../__tests__/setup';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../core/errors';
import { getDb } from '../core/lib/firebase-admin';
import { GroupService } from './group.service';

const mockDb = getDb() as any;

function makeGroupData(overrides: Record<string, unknown> = {}) {
  return {
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

describe('GroupService', () => {
  let service: GroupService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GroupService();
  });

  describe('getGroup', () => {
    it('should return group when found', async () => {
      const groupData = makeGroupData();
      const docSnap = mockDocSnapshot('group-1', groupData);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      const group = await service.getGroup('group-1');
      expect(group).toBeTruthy();
      expect(group?.name).toBe('Test Group');
    });

    it('should return null when group not found', async () => {
      const docSnap = mockDocSnapshot('group-1', null, false);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      const group = await service.getGroup('group-1');
      expect(group).toBeNull();
    });
  });

  describe('getGroupByName', () => {
    it('should return group matching name', async () => {
      const groupData = makeGroupData({ name: 'Admins' });
      const docSnap = mockDocSnapshot('admin', groupData);
      const querySnap = mockQuerySnapshot([docSnap]);

      const chain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(querySnap),
      };
      mockDb.collection = vi.fn().mockReturnValue(chain);

      const group = await service.getGroupByName('Admins');
      expect(group?.name).toBe('Admins');
    });

    it('should return null when no match', async () => {
      const querySnap = mockQuerySnapshot([]);
      const chain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(querySnap),
      };
      mockDb.collection = vi.fn().mockReturnValue(chain);

      const group = await service.getGroupByName('Nonexistent');
      expect(group).toBeNull();
    });
  });

  describe('createGroup', () => {
    it('should create a new group', async () => {
      // No existing group with same name
      const emptySnap = mockQuerySnapshot([]);
      const nameChain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(emptySnap),
      };

      const mockDocRef = {
        id: 'new-group-id',
        set: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection = vi.fn().mockReturnValue({
        ...nameChain,
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const group = await service.createGroup(
        { name: 'New Group', description: 'Desc', permissions: ['users:read'] },
        'creator-1'
      );

      expect(group.name).toBe('New Group');
      expect(group.isDefault).toBe(false);
      expect(group.isSystem).toBe(false);
      expect(mockDocRef.set).toHaveBeenCalled();
    });

    it('should throw ConflictError if name already exists', async () => {
      const existingDoc = mockDocSnapshot('existing', makeGroupData());
      const querySnap = mockQuerySnapshot([existingDoc]);

      const chain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(querySnap),
      };
      mockDb.collection = vi.fn().mockReturnValue(chain);

      await expect(
        service.createGroup({ name: 'Test Group', description: '' }, 'creator')
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateGroup', () => {
    it('should update group name and description', async () => {
      const groupData = makeGroupData();
      const docSnap = mockDocSnapshot('group-1', groupData);

      // For name conflict check (no conflict)
      const emptySnap = mockQuerySnapshot([]);
      const nameChain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(emptySnap),
      };

      const mockDocRef = {
        get: vi.fn().mockResolvedValue(docSnap),
        update: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection = vi.fn().mockReturnValue({
        ...nameChain,
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const updated = await service.updateGroup('group-1', { name: 'Updated Name' }, 'updater-1');
      expect(updated.name).toBe('Updated Name');
    });

    it('should throw NotFoundError if group missing', async () => {
      const docSnap = mockDocSnapshot('group-1', null, false);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.updateGroup('group-1', { name: 'New' }, 'updater')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ConflictError if renaming to existing name', async () => {
      const groupData = makeGroupData({ name: 'Old Name' });
      const docSnap = mockDocSnapshot('group-1', groupData);

      const conflictDoc = mockDocSnapshot('other', makeGroupData({ name: 'Taken' }));
      const conflictSnap = mockQuerySnapshot([conflictDoc]);

      const nameChain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(conflictSnap),
      };

      const mockDocRef = {
        get: vi.fn().mockResolvedValue(docSnap),
        update: vi.fn(),
      };

      mockDb.collection = vi.fn().mockReturnValue({
        ...nameChain,
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      await expect(service.updateGroup('group-1', { name: 'Taken' }, 'updater')).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('deleteGroup', () => {
    it('should delete a non-system, non-default group with no users', async () => {
      const groupData = makeGroupData({ isSystem: false, isDefault: false });
      const docSnap = mockDocSnapshot('group-1', groupData);

      const mockDocRef = {
        get: vi.fn().mockResolvedValue(docSnap),
        delete: vi.fn().mockResolvedValue(undefined),
      };

      // User count = 0
      const countChain = {
        where: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
        }),
      };

      mockDb.collection = vi.fn().mockImplementation((name: string) => {
        if (name === 'users') return countChain;
        return { doc: vi.fn().mockReturnValue(mockDocRef) };
      });

      await service.deleteGroup('group-1');
      expect(mockDocRef.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenError for system groups', async () => {
      const groupData = makeGroupData({ isSystem: true });
      const docSnap = mockDocSnapshot('admin', groupData);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.deleteGroup('admin')).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for default group', async () => {
      const groupData = makeGroupData({ isDefault: true });
      const docSnap = mockDocSnapshot('users', groupData);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.deleteGroup('users')).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError if group has users', async () => {
      const groupData = makeGroupData();
      const docSnap = mockDocSnapshot('group-1', groupData);

      const mockDocRef = {
        get: vi.fn().mockResolvedValue(docSnap),
      };

      const countChain = {
        where: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ data: () => ({ count: 3 }) }),
        }),
      };

      mockDb.collection = vi.fn().mockImplementation((name: string) => {
        if (name === 'users') return countChain;
        return { doc: vi.fn().mockReturnValue(mockDocRef) };
      });

      await expect(service.deleteGroup('group-1')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if group missing', async () => {
      const docSnap = mockDocSnapshot('group-1', null, false);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.deleteGroup('group-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateGroupPermissions', () => {
    it('should update permissions for a group', async () => {
      const groupData = makeGroupData({ permissions: ['users:read'] });
      const docSnap = mockDocSnapshot('group-1', groupData);
      const mockDocRef = {
        get: vi.fn().mockResolvedValue(docSnap),
        update: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const updated = await service.updateGroupPermissions(
        'group-1',
        ['users:read', 'users:update'],
        'updater'
      );
      expect(updated.permissions).toEqual(['users:read', 'users:update']);
    });

    it('should throw NotFoundError if group missing', async () => {
      const docSnap = mockDocSnapshot('group-1', null, false);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.updateGroupPermissions('group-1', [], 'updater')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getGroupUsers', () => {
    it('should return users in the group', async () => {
      const groupData = makeGroupData();
      const groupSnap = mockDocSnapshot('group-1', groupData);

      const user1 = mockDocSnapshot('u1', { email: 'a@b.com', groupIds: ['group-1'] });
      const userQuerySnap = mockQuerySnapshot([user1]);

      mockDb.collection = vi.fn().mockImplementation((name: string) => {
        if (name === 'users') {
          return {
            where: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue(userQuerySnap),
          };
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(groupSnap),
          }),
        };
      });

      const users = await service.getGroupUsers('group-1');
      expect(users.length).toBe(1);
    });

    it('should throw NotFoundError if group does not exist', async () => {
      const docSnap = mockDocSnapshot('group-1', null, false);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.getGroupUsers('group-1')).rejects.toThrow(NotFoundError);
    });
  });
});
