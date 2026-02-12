import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createChainMock, mockAuth, resetDbMocks } from '../__tests__/setup';
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
import { UserService } from './user.service';

const mockDb = db as any;

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

/**
 * Helper: set up mockDb.select to handle the common pattern of
 * getUser (select user row) followed by getUserGroupIds (select from userGroups).
 */
function mockGetUser(
  userRow: ReturnType<typeof makeUserRow> | null,
  groupIds: string[] = ['users']
) {
  let selectCallCount = 0;
  mockDb.select.mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // user row query
      return createChainMock(userRow ? [userRow] : []);
    }
    // getUserGroupIds query
    return createChainMock(groupIds.map((gid) => ({ groupId: gid })));
  });
}

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks(mockDb);
    service = new UserService();
  });

  describe('getUser', () => {
    it('should return user when found', async () => {
      const userRow = makeUserRow();
      mockGetUser(userRow, ['users']);

      const user = await service.getUser('user-1');
      expect(user).toBeTruthy();
      expect(user?.id).toBe('user-1');
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      const user = await service.getUser('user-1');
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user matching email', async () => {
      const userRow = makeUserRow();

      // getUserByEmail: select user by email, then getUserGroupIds
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createChainMock([userRow]);
        }
        return createChainMock([{ groupId: 'users' }]);
      });

      const user = await service.getUserByEmail('Test@Example.com');
      expect(user).toBeTruthy();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null when no match', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      const user = await service.getUserByEmail('nobody@example.com');
      expect(user).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create user with default group when no groupIds specified', async () => {
      // getUserByEmail returns empty (no conflict)
      // Then settings query for default group
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // getUserByEmail query -> no existing user
          return createChainMock([]);
        }
        // settings query for default group
        return createChainMock([{ id: 'app', defaultGroupId: 'default-group' }]);
      });

      // Transaction for inserting user + userGroups
      const txChain = createChainMock();
      const tx = {
        select: vi.fn().mockReturnValue(txChain),
        insert: vi.fn().mockReturnValue(txChain),
        update: vi.fn().mockReturnValue(txChain),
        delete: vi.fn().mockReturnValue(txChain),
      };
      mockDb.transaction.mockImplementation(async (fn: any) => fn(tx));

      const user = await service.createUser(
        { email: 'new@example.com', displayName: 'New User' },
        'creator-1'
      );

      expect(user.email).toBe('new@example.com');
      expect(user.groupIds).toEqual(['default-group']);
      expect(user.isSuperAdmin).toBe(false);
      expect(user.status).toBe('active');
    });

    it('should throw ConflictError if email already exists', async () => {
      const existingRow = makeUserRow();

      // getUserByEmail: first select returns user row, then getUserGroupIds
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createChainMock([existingRow]);
        }
        return createChainMock([{ groupId: 'users' }]);
      });

      await expect(
        service.createUser({ email: 'test@example.com', displayName: 'Dup' }, 'creator')
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateUser', () => {
    it('should update displayName', async () => {
      const userRow = makeUserRow();

      // getUser: select user row, then getUserGroupIds
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createChainMock([userRow]);
        }
        return createChainMock([{ groupId: 'users' }]);
      });

      mockDb.update.mockReturnValue(createChainMock([]));

      const updated = await service.updateUser('user-1', {
        displayName: 'New Name',
      });
      expect(updated.displayName).toBe('New Name');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      await expect(service.updateUser('user-1', { displayName: 'New' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ForbiddenError when disabling a super admin', async () => {
      const userRow = makeUserRow({ isSuperAdmin: true, status: 'active' });

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createChainMock([userRow]);
        }
        return createChainMock([{ groupId: 'admin' }]);
      });

      await expect(service.updateUser('admin-1', { status: 'disabled' })).rejects.toThrow(
        ForbiddenError
      );
    });

    it('should validate groupIds exist when changing groups', async () => {
      const userRow = makeUserRow();

      // First two selects: getUser (user row + getUserGroupIds)
      // Third select: validate group IDs exist -> returns empty (group not found)
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createChainMock([userRow]);
        }
        if (selectCallCount === 2) {
          return createChainMock([{ groupId: 'users' }]);
        }
        // group validation query returns empty -> group not found
        return createChainMock([]);
      });

      await expect(service.updateUser('user-1', { groupIds: ['bad-group'] })).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a regular user', async () => {
      const userRow = makeUserRow();
      mockGetUser(userRow, ['users']);

      mockDb.delete.mockReturnValue(createChainMock([]));
      mockAuth.deleteUser.mockResolvedValue(undefined);

      await service.deleteUser('user-1');
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockAuth.deleteUser).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundError for nonexistent user', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      await expect(service.deleteUser('user-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when deleting a super admin', async () => {
      const userRow = makeUserRow({ isSuperAdmin: true });
      mockGetUser(userRow, ['admin']);

      await expect(service.deleteUser('admin-1')).rejects.toThrow(ForbiddenError);
    });

    it('should not throw if Firebase Auth delete fails', async () => {
      const userRow = makeUserRow();
      mockGetUser(userRow, ['users']);

      mockDb.delete.mockReturnValue(createChainMock([]));
      mockAuth.deleteUser.mockRejectedValue(new Error('Auth user not found'));

      // Should not throw
      await service.deleteUser('user-1');
    });
  });

  describe('disableUser', () => {
    it('should disable an active user', async () => {
      const userRow = makeUserRow({ status: 'active' });
      mockGetUser(userRow, ['users']);

      mockDb.update.mockReturnValue(createChainMock([]));
      mockAuth.updateUser.mockResolvedValue(undefined);

      const result = await service.disableUser('user-1', 'admin-1');
      expect(result.status).toBe('disabled');
      expect(result.disabledBy).toBe('admin-1');
    });

    it('should throw if user is already disabled', async () => {
      const userRow = makeUserRow({ status: 'disabled' });
      mockGetUser(userRow, ['users']);

      await expect(service.disableUser('user-1', 'admin-1')).rejects.toThrow(ValidationError);
    });

    it('should throw ForbiddenError for super admin', async () => {
      const userRow = makeUserRow({ isSuperAdmin: true });
      mockGetUser(userRow, ['admin']);

      await expect(service.disableUser('admin-1', 'other')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('enableUser', () => {
    it('should enable a disabled user', async () => {
      const userRow = makeUserRow({ status: 'disabled' });
      mockGetUser(userRow, ['users']);

      mockDb.update.mockReturnValue(createChainMock([]));
      mockAuth.updateUser.mockResolvedValue(undefined);

      const result = await service.enableUser('user-1');
      expect(result.status).toBe('active');
    });

    it('should throw if user is already active', async () => {
      const userRow = makeUserRow({ status: 'active' });
      mockGetUser(userRow, ['users']);

      await expect(service.enableUser('user-1')).rejects.toThrow(ValidationError);
    });
  });

  describe('addUserToGroup', () => {
    it('should add a group to user via transaction', async () => {
      const userRow = makeUserRow();
      const groupRow = {
        id: 'admin',
        name: 'Admin',
        description: '',
        permissions: [],
        isDefault: false,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        updatedBy: 'system',
      };

      // Set up transaction mock where tx.select returns different results
      let txSelectCallCount = 0;
      const txChain = createChainMock();
      const tx = {
        select: vi.fn().mockImplementation(() => {
          txSelectCallCount++;
          if (txSelectCallCount === 1) {
            // Check group exists
            return createChainMock([groupRow]);
          }
          if (txSelectCallCount === 2) {
            // Check user exists
            return createChainMock([userRow]);
          }
          // getUserGroupIds inside transaction
          return createChainMock([{ groupId: 'users' }]);
        }),
        insert: vi.fn().mockReturnValue(txChain),
        update: vi.fn().mockReturnValue(txChain),
        delete: vi.fn().mockReturnValue(txChain),
      };
      mockDb.transaction.mockImplementation(async (fn: any) => fn(tx));

      const result = await service.addUserToGroup('user-1', 'admin');
      expect(result.groupIds).toContain('admin');
      expect(result.groupIds).toContain('users');
    });

    it('should throw ValidationError if user already in group', async () => {
      const userRow = makeUserRow();
      const groupRow = {
        id: 'admin',
        name: 'Admin',
        description: '',
        permissions: [],
        isDefault: false,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        updatedBy: 'system',
      };

      let txSelectCallCount = 0;
      const tx = {
        select: vi.fn().mockImplementation(() => {
          txSelectCallCount++;
          if (txSelectCallCount === 1) return createChainMock([groupRow]);
          if (txSelectCallCount === 2) return createChainMock([userRow]);
          // User already has 'admin' group
          return createChainMock([{ groupId: 'admin' }]);
        }),
        insert: vi.fn().mockReturnValue(createChainMock()),
        update: vi.fn().mockReturnValue(createChainMock()),
        delete: vi.fn().mockReturnValue(createChainMock()),
      };
      mockDb.transaction.mockImplementation(async (fn: any) => fn(tx));

      await expect(service.addUserToGroup('user-1', 'admin')).rejects.toThrow(ValidationError);
    });

    it('should throw ForbiddenError for super admin', async () => {
      const userRow = makeUserRow({ isSuperAdmin: true });
      const groupRow = {
        id: 'users',
        name: 'Users',
        description: '',
        permissions: [],
        isDefault: true,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        updatedBy: 'system',
      };

      let txSelectCallCount = 0;
      const tx = {
        select: vi.fn().mockImplementation(() => {
          txSelectCallCount++;
          if (txSelectCallCount === 1) return createChainMock([groupRow]);
          if (txSelectCallCount === 2) return createChainMock([userRow]);
          return createChainMock([{ groupId: 'admin' }]);
        }),
        insert: vi.fn().mockReturnValue(createChainMock()),
        update: vi.fn().mockReturnValue(createChainMock()),
        delete: vi.fn().mockReturnValue(createChainMock()),
      };
      mockDb.transaction.mockImplementation(async (fn: any) => fn(tx));

      await expect(service.addUserToGroup('admin-1', 'users')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('removeUserFromGroup', () => {
    it('should remove a group from user', async () => {
      const userRow = makeUserRow();

      let txSelectCallCount = 0;
      const txChain = createChainMock();
      const tx = {
        select: vi.fn().mockImplementation(() => {
          txSelectCallCount++;
          if (txSelectCallCount === 1) {
            // Check user exists
            return createChainMock([userRow]);
          }
          // getUserGroupIds - user is in both groups
          return createChainMock([{ groupId: 'users' }, { groupId: 'admin' }]);
        }),
        insert: vi.fn().mockReturnValue(txChain),
        update: vi.fn().mockReturnValue(txChain),
        delete: vi.fn().mockReturnValue(txChain),
      };
      mockDb.transaction.mockImplementation(async (fn: any) => fn(tx));

      const result = await service.removeUserFromGroup('user-1', 'admin');
      expect(result.groupIds).toEqual(['users']);
    });

    it('should throw if user not in group', async () => {
      const userRow = makeUserRow();

      let txSelectCallCount = 0;
      const tx = {
        select: vi.fn().mockImplementation(() => {
          txSelectCallCount++;
          if (txSelectCallCount === 1) return createChainMock([userRow]);
          // User only in 'users' group, not 'admin'
          return createChainMock([{ groupId: 'users' }]);
        }),
        insert: vi.fn().mockReturnValue(createChainMock()),
        update: vi.fn().mockReturnValue(createChainMock()),
        delete: vi.fn().mockReturnValue(createChainMock()),
      };
      mockDb.transaction.mockImplementation(async (fn: any) => fn(tx));

      await expect(service.removeUserFromGroup('user-1', 'admin')).rejects.toThrow(ValidationError);
    });

    it('should throw if removing last group', async () => {
      const userRow = makeUserRow();

      let txSelectCallCount = 0;
      const tx = {
        select: vi.fn().mockImplementation(() => {
          txSelectCallCount++;
          if (txSelectCallCount === 1) return createChainMock([userRow]);
          // User only in 'users' group
          return createChainMock([{ groupId: 'users' }]);
        }),
        insert: vi.fn().mockReturnValue(createChainMock()),
        update: vi.fn().mockReturnValue(createChainMock()),
        delete: vi.fn().mockReturnValue(createChainMock()),
      };
      mockDb.transaction.mockImplementation(async (fn: any) => fn(tx));

      await expect(service.removeUserFromGroup('user-1', 'users')).rejects.toThrow(ValidationError);
    });
  });
});
