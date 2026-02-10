import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { mockDocSnapshot, mockQuerySnapshot } from '../__tests__/setup';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../core/errors';
import { getAuthAdmin, getDb } from '../core/lib/firebase-admin';
import { UserService } from './user.service';

// Get mocked instances
const mockDb = getDb() as any;
const mockAuth = getAuthAdmin() as any;

function makeUserData(overrides: Record<string, unknown> = {}) {
  return {
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    groupIds: ['users'],
    isSuperAdmin: false,
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-01'),
    preferences: { theme: 'system' },
    ...overrides,
  };
}

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService();
  });

  describe('getUser', () => {
    it('should return user when found', async () => {
      const userData = makeUserData();
      const docSnap = mockDocSnapshot('user-1', userData);

      const mockDoc = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue(docSnap),
      });
      const mockColl = { doc: mockDoc };
      mockDb.collection = vi.fn().mockReturnValue(mockColl);

      const user = await service.getUser('user-1');
      expect(user).toBeTruthy();
      expect(user?.id).toBe('user-1');
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      const docSnap = mockDocSnapshot('user-1', null, false);

      const mockDoc = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue(docSnap),
      });
      mockDb.collection = vi.fn().mockReturnValue({ doc: mockDoc });

      const user = await service.getUser('user-1');
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user matching email', async () => {
      const userData = makeUserData();
      const docSnap = mockDocSnapshot('user-1', userData);
      const querySnap = mockQuerySnapshot([docSnap]);

      const chain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(querySnap),
      };
      mockDb.collection = vi.fn().mockReturnValue(chain);

      const user = await service.getUserByEmail('Test@Example.com');
      expect(user).toBeTruthy();
      expect(chain.where).toHaveBeenCalledWith('email', '==', 'test@example.com');
    });

    it('should return null when no match', async () => {
      const querySnap = mockQuerySnapshot([]);

      const chain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(querySnap),
      };
      mockDb.collection = vi.fn().mockReturnValue(chain);

      const user = await service.getUserByEmail('nobody@example.com');
      expect(user).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create user with default group when no groupIds specified', async () => {
      // Mock: no existing user with same email
      const emptySnap = mockQuerySnapshot([]);
      const emailChain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(emptySnap),
      };

      // Mock: settings doc for default group
      const settingsSnap = mockDocSnapshot('app', { defaultGroupId: 'default-group' });

      const mockDocRef = {
        id: 'new-user-id',
        get: vi.fn(),
        set: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection = vi.fn().mockImplementation((name: string) => {
        if (name === 'settings') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(settingsSnap),
            }),
          };
        }
        // users collection
        return {
          ...emailChain,
          doc: vi.fn().mockReturnValue(mockDocRef),
        };
      });

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
      const existingDoc = mockDocSnapshot('existing-1', makeUserData());
      const querySnap = mockQuerySnapshot([existingDoc]);

      const chain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(querySnap),
      };
      mockDb.collection = vi.fn().mockReturnValue(chain);

      await expect(
        service.createUser({ email: 'test@example.com', displayName: 'Dup' }, 'creator')
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateUser', () => {
    it('should update displayName', async () => {
      const userData = makeUserData();
      const docSnap = mockDocSnapshot('user-1', userData);
      const mockDocRef = {
        get: vi.fn().mockResolvedValue(docSnap),
        update: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const updated = await service.updateUser('user-1', {
        displayName: 'New Name',
      });
      expect(updated.displayName).toBe('New Name');
      expect(mockDocRef.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      const docSnap = mockDocSnapshot('user-1', null, false);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.updateUser('user-1', { displayName: 'New' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ForbiddenError when disabling a super admin', async () => {
      const userData = makeUserData({ isSuperAdmin: true, status: 'active' });
      const docSnap = mockDocSnapshot('admin-1', userData);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
          update: vi.fn(),
        }),
      });

      await expect(service.updateUser('admin-1', { status: 'disabled' })).rejects.toThrow(
        ForbiddenError
      );
    });

    it('should validate groupIds exist when changing groups', async () => {
      const userData = makeUserData();
      const docSnap = mockDocSnapshot('user-1', userData);

      // Group does not exist
      const missingGroupSnap = mockDocSnapshot('bad-group', null, false);

      mockDb.collection = vi.fn().mockImplementation((name: string) => {
        if (name === 'groups') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(missingGroupSnap),
            }),
          };
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(docSnap),
            update: vi.fn(),
          }),
        };
      });

      await expect(service.updateUser('user-1', { groupIds: ['bad-group'] })).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a regular user', async () => {
      const userData = makeUserData();
      const docSnap = mockDocSnapshot('user-1', userData);
      const mockDocRef = {
        get: vi.fn().mockResolvedValue(docSnap),
        delete: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });
      mockAuth.deleteUser = vi.fn().mockResolvedValue(undefined);

      await service.deleteUser('user-1');
      expect(mockDocRef.delete).toHaveBeenCalled();
      expect(mockAuth.deleteUser).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundError for nonexistent user', async () => {
      const docSnap = mockDocSnapshot('user-1', null, false);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.deleteUser('user-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when deleting a super admin', async () => {
      const userData = makeUserData({ isSuperAdmin: true });
      const docSnap = mockDocSnapshot('admin-1', userData);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.deleteUser('admin-1')).rejects.toThrow(ForbiddenError);
    });

    it('should not throw if Firebase Auth delete fails', async () => {
      const userData = makeUserData();
      const docSnap = mockDocSnapshot('user-1', userData);
      const mockDocRef = {
        get: vi.fn().mockResolvedValue(docSnap),
        delete: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });
      mockAuth.deleteUser = vi.fn().mockRejectedValue(new Error('Auth user not found'));

      // Should not throw
      await service.deleteUser('user-1');
    });
  });

  describe('disableUser', () => {
    it('should disable an active user', async () => {
      const userData = makeUserData({ status: 'active' });
      const docSnap = mockDocSnapshot('user-1', userData);
      const mockDocRef = {
        get: vi.fn().mockResolvedValue(docSnap),
        update: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });
      mockAuth.updateUser = vi.fn().mockResolvedValue(undefined);

      const result = await service.disableUser('user-1', 'admin-1');
      expect(result.status).toBe('disabled');
      expect(result.disabledBy).toBe('admin-1');
    });

    it('should throw if user is already disabled', async () => {
      const userData = makeUserData({ status: 'disabled' });
      const docSnap = mockDocSnapshot('user-1', userData);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.disableUser('user-1', 'admin-1')).rejects.toThrow(ValidationError);
    });

    it('should throw ForbiddenError for super admin', async () => {
      const userData = makeUserData({ isSuperAdmin: true });
      const docSnap = mockDocSnapshot('admin-1', userData);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.disableUser('admin-1', 'other')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('enableUser', () => {
    it('should enable a disabled user', async () => {
      const userData = makeUserData({ status: 'disabled' });
      const docSnap = mockDocSnapshot('user-1', userData);
      const mockDocRef = {
        get: vi.fn().mockResolvedValue(docSnap),
        update: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });
      mockAuth.updateUser = vi.fn().mockResolvedValue(undefined);

      const result = await service.enableUser('user-1');
      expect(result.status).toBe('active');
    });

    it('should throw if user is already active', async () => {
      const userData = makeUserData({ status: 'active' });
      const docSnap = mockDocSnapshot('user-1', userData);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      await expect(service.enableUser('user-1')).rejects.toThrow(ValidationError);
    });
  });

  describe('addUserToGroup', () => {
    it('should add a group to user via transaction', async () => {
      const userData = makeUserData({ groupIds: ['users'] });
      const userSnap = mockDocSnapshot('user-1', userData);
      const groupSnap = mockDocSnapshot('admin', { name: 'Admin', permissions: [] });

      const mockTransaction = {
        get: vi.fn().mockResolvedValueOnce(groupSnap).mockResolvedValueOnce(userSnap),
        update: vi.fn(),
      };

      mockDb.runTransaction = vi.fn().mockImplementation(async (fn) => fn(mockTransaction));
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({ id: 'mock' }),
      });

      const result = await service.addUserToGroup('user-1', 'admin');
      expect(result.groupIds).toContain('admin');
      expect(result.groupIds).toContain('users');
    });

    it('should throw ValidationError if user already in group', async () => {
      const userData = makeUserData({ groupIds: ['admin'] });
      const userSnap = mockDocSnapshot('user-1', userData);
      const groupSnap = mockDocSnapshot('admin', { name: 'Admin', permissions: [] });

      const mockTransaction = {
        get: vi.fn().mockResolvedValueOnce(groupSnap).mockResolvedValueOnce(userSnap),
        update: vi.fn(),
      };

      mockDb.runTransaction = vi.fn().mockImplementation(async (fn) => fn(mockTransaction));
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({ id: 'mock' }),
      });

      await expect(service.addUserToGroup('user-1', 'admin')).rejects.toThrow(ValidationError);
    });

    it('should throw ForbiddenError for super admin', async () => {
      const userData = makeUserData({ isSuperAdmin: true, groupIds: ['admin'] });
      const userSnap = mockDocSnapshot('admin-1', userData);
      const groupSnap = mockDocSnapshot('users', { name: 'Users', permissions: [] });

      const mockTransaction = {
        get: vi.fn().mockResolvedValueOnce(groupSnap).mockResolvedValueOnce(userSnap),
      };

      mockDb.runTransaction = vi.fn().mockImplementation(async (fn) => fn(mockTransaction));
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({ id: 'mock' }),
      });

      await expect(service.addUserToGroup('admin-1', 'users')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('removeUserFromGroup', () => {
    it('should remove a group from user', async () => {
      const userData = makeUserData({ groupIds: ['users', 'admin'] });
      const userSnap = mockDocSnapshot('user-1', userData);

      const mockTransaction = {
        get: vi.fn().mockResolvedValue(userSnap),
        update: vi.fn(),
      };

      mockDb.runTransaction = vi.fn().mockImplementation(async (fn) => fn(mockTransaction));
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({ id: 'mock' }),
      });

      const result = await service.removeUserFromGroup('user-1', 'admin');
      expect(result.groupIds).toEqual(['users']);
    });

    it('should throw if user not in group', async () => {
      const userData = makeUserData({ groupIds: ['users'] });
      const userSnap = mockDocSnapshot('user-1', userData);

      const mockTransaction = {
        get: vi.fn().mockResolvedValue(userSnap),
      };

      mockDb.runTransaction = vi.fn().mockImplementation(async (fn) => fn(mockTransaction));
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({ id: 'mock' }),
      });

      await expect(service.removeUserFromGroup('user-1', 'admin')).rejects.toThrow(ValidationError);
    });

    it('should throw if removing last group', async () => {
      const userData = makeUserData({ groupIds: ['users'] });
      const userSnap = mockDocSnapshot('user-1', userData);

      const mockTransaction = {
        get: vi.fn().mockResolvedValue(userSnap),
      };

      mockDb.runTransaction = vi.fn().mockImplementation(async (fn) => fn(mockTransaction));
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({ id: 'mock' }),
      });

      await expect(service.removeUserFromGroup('user-1', 'users')).rejects.toThrow(ValidationError);
    });
  });
});
