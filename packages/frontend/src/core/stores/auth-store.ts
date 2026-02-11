import type { AuthUser } from '@/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  updatePermissions: (permissions: string[]) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  error: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user: AuthUser | null) => {
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setInitialized: (isInitialized: boolean) => {
        set({ isInitialized, isLoading: false });
      },

      setError: (error: string | null) => {
        set({ error, isLoading: false });
      },

      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      updatePermissions: (permissions: string[]) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              permissions,
            },
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Strip permissions and isSuperAdmin from persistence — they are
        // always fetched fresh from the backend on init via AuthInitializer
        user: state.user ? { ...state.user, permissions: [], isSuperAdmin: false } : null,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors for common use cases
export const selectUser = (state: AuthStore) => state.user;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectIsLoading = (state: AuthStore) => state.isLoading;
export const selectIsInitialized = (state: AuthStore) => state.isInitialized;
export const selectPermissions = (state: AuthStore) => state.user?.permissions ?? [];

// Helper to check if user has a specific permission
export const hasPermission = (state: AuthStore, permission: string): boolean => {
  // Super admins bypass all permission checks
  if (state.user?.isSuperAdmin) return true;
  const permissions = state.user?.permissions ?? [];
  // Check for exact match or wildcard
  return permissions.some((p) => {
    if (p === '*' || p === 'admin:*') return true;
    if (p === permission) return true;
    // Check for wildcard patterns (e.g., "users:*" matches "users:read")
    const [resource] = permission.split(':');
    const [pResource, pAction] = p.split(':');
    return pResource === resource && pAction === '*';
  });
};

// Helper to check if user has any of the specified permissions
export const hasAnyPermission = (state: AuthStore, permissions: string[]): boolean => {
  if (state.user?.isSuperAdmin) return true;
  return permissions.some((permission) => hasPermission(state, permission));
};

// Helper to check if user has all of the specified permissions
export const hasAllPermissions = (state: AuthStore, permissions: string[]): boolean => {
  if (state.user?.isSuperAdmin) return true;
  return permissions.every((permission) => hasPermission(state, permission));
};

export default useAuthStore;
