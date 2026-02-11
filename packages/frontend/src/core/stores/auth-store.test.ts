import { beforeEach, describe, expect, it } from 'bun:test';
import type { AuthUser } from '@/types';
import { hasAllPermissions, hasAnyPermission, hasPermission, useAuthStore } from './auth-store';

const mockUser: AuthUser = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  firstName: 'Test',
  lastName: 'User',
  permissions: ['users:read', 'users:list', 'groups:*'],
  isSuperAdmin: false,
};

const mockSuperAdmin: AuthUser = {
  uid: 'admin-123',
  email: 'admin@example.com',
  displayName: 'Admin User',
  photoURL: null,
  firstName: 'Admin',
  lastName: 'User',
  permissions: [],
  isSuperAdmin: true,
};

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      error: null,
    });
  });

  describe('setUser', () => {
    it('sets user and marks as authenticated', () => {
      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('clears user when set to null', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setUser(null);
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setInitialized', () => {
    it('sets initialized and clears loading', () => {
      useAuthStore.getState().setInitialized(true);
      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error and clears loading', () => {
      useAuthStore.getState().setError('Something went wrong');
      const state = useAuthStore.getState();
      expect(state.error).toBe('Something went wrong');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('clearAuth', () => {
    it('clears auth state', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().clearAuth();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('updatePermissions', () => {
    it('updates user permissions', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().updatePermissions(['admin:*']);
      expect(useAuthStore.getState().user?.permissions).toEqual(['admin:*']);
    });

    it('does nothing if no user', () => {
      useAuthStore.getState().updatePermissions(['admin:*']);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });
});

describe('hasPermission', () => {
  it('returns true for exact permission match', () => {
    const state = { user: mockUser } as ReturnType<typeof useAuthStore.getState>;
    expect(hasPermission(state, 'users:read')).toBe(true);
  });

  it('returns false for missing permission', () => {
    const state = { user: mockUser } as ReturnType<typeof useAuthStore.getState>;
    expect(hasPermission(state, 'audit:list')).toBe(false);
  });

  it('returns true for wildcard resource permission', () => {
    const state = { user: mockUser } as ReturnType<typeof useAuthStore.getState>;
    expect(hasPermission(state, 'groups:read')).toBe(true);
    expect(hasPermission(state, 'groups:delete')).toBe(true);
  });

  it('returns true for super admin', () => {
    const state = { user: mockSuperAdmin } as ReturnType<typeof useAuthStore.getState>;
    expect(hasPermission(state, 'anything:here')).toBe(true);
  });

  it('returns true for global wildcard', () => {
    const user = { ...mockUser, permissions: ['*'] };
    const state = { user } as ReturnType<typeof useAuthStore.getState>;
    expect(hasPermission(state, 'anything:here')).toBe(true);
  });

  it('returns true for admin wildcard', () => {
    const user = { ...mockUser, permissions: ['admin:*'] };
    const state = { user } as ReturnType<typeof useAuthStore.getState>;
    expect(hasPermission(state, 'anything:here')).toBe(true);
  });
});

describe('hasAnyPermission', () => {
  it('returns true if user has any of the specified permissions', () => {
    const state = { user: mockUser } as ReturnType<typeof useAuthStore.getState>;
    expect(hasAnyPermission(state, ['users:read', 'audit:list'])).toBe(true);
  });

  it('returns false if user has none of the specified permissions', () => {
    const state = { user: mockUser } as ReturnType<typeof useAuthStore.getState>;
    expect(hasAnyPermission(state, ['audit:list', 'audit:delete'])).toBe(false);
  });

  it('returns true for super admin', () => {
    const state = { user: mockSuperAdmin } as ReturnType<typeof useAuthStore.getState>;
    expect(hasAnyPermission(state, ['anything:here'])).toBe(true);
  });
});

describe('hasAllPermissions', () => {
  it('returns true if user has all specified permissions', () => {
    const state = { user: mockUser } as ReturnType<typeof useAuthStore.getState>;
    expect(hasAllPermissions(state, ['users:read', 'users:list'])).toBe(true);
  });

  it('returns false if user is missing any permission', () => {
    const state = { user: mockUser } as ReturnType<typeof useAuthStore.getState>;
    expect(hasAllPermissions(state, ['users:read', 'audit:list'])).toBe(false);
  });

  it('returns true for super admin', () => {
    const state = { user: mockSuperAdmin } as ReturnType<typeof useAuthStore.getState>;
    expect(hasAllPermissions(state, ['a:b', 'c:d'])).toBe(true);
  });
});
