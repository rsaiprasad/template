import { api } from '@/api';
import { type FirebaseUser, onAuthChange } from '@/lib/firebase';
import { parseDisplayName } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthUser } from '@/types';
import { useCallback, useEffect } from 'react';

/**
 * Parse Firebase user to app user with basic info
 */
function parseFirebaseUser(firebaseUser: FirebaseUser): Partial<AuthUser> {
  const { firstName, lastName } = parseDisplayName(firebaseUser.displayName);

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    firstName,
    lastName,
  };
}

/**
 * Component that initializes Firebase auth state.
 * This should be rendered at the root of the app to set up the auth listener.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, setInitialized, setError, clearAuth } = useAuthStore();

  // Fetch full user data from backend
  const fetchUserData = useCallback(
    async (firebaseUser: FirebaseUser): Promise<AuthUser> => {
      try {
        const response = await api.getMe();
        if (!response.success) {
          throw new Error(response.error.message);
        }
        const userData = response.data;

        const backendName = parseDisplayName(userData.displayName);
        const firebaseName = parseDisplayName(firebaseUser.displayName);
        const typedUserData = userData as {
          permissions?: string[];
          isSuperAdmin?: boolean;
          groupIds?: string[];
          groupNames?: string[];
        };
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          firstName: backendName.firstName || firebaseName.firstName,
          lastName: backendName.lastName || firebaseName.lastName,
          permissions: typedUserData.permissions || [],
          isSuperAdmin: typedUserData.isSuperAdmin ?? false,
          groupIds: typedUserData.groupIds,
          groupNames: typedUserData.groupNames,
        };
      } catch (err) {
        // If backend is unavailable, use basic Firebase user data
        console.warn('Could not fetch user data from backend:', err);
        const partialUser = parseFirebaseUser(firebaseUser);
        return {
          ...partialUser,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          firstName: partialUser.firstName || '',
          lastName: partialUser.lastName || '',
          permissions: [],
        };
      }
    },
    []
  );

  // Initialize auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        try {
          const authUser = await fetchUserData(firebaseUser);
          setUser(authUser);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to initialize auth');
        }
      } else {
        clearAuth();
      }
      setInitialized(true);
    });

    return () => unsubscribe();
  }, [fetchUserData, setUser, setLoading, setInitialized, setError, clearAuth]);

  return <>{children}</>;
}

export default AuthInitializer;
