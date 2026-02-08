import { api } from '@/api';
import {
  type FirebaseUser,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOut as firebaseSignOut,
  onAuthChange,
} from '@/lib/firebase';
import { parseDisplayName } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthUser } from '@/types';
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/**
 * Parse Firebase user to app user
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

export function useAuth(): UseAuthReturn {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    setUser,
    setLoading,
    setInitialized,
    setError,
    clearAuth,
  } = useAuthStore();

  // Ensure user exists in backend (call login endpoint if needed)
  const ensureBackendUser = useCallback(async (firebaseUser: FirebaseUser): Promise<void> => {
    const idToken = await firebaseUser.getIdToken();
    await api.login(idToken);
  }, []);

  // Fetch full user data from backend
  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser): Promise<AuthUser> => {
    try {
      let response = await api.getMe();

      // If user not registered, call login to create the Firestore document
      if (!response.success && response.error?.message?.includes('not registered')) {
        await ensureBackendUser(firebaseUser);
        response = await api.getMe();
      }

      if (!response.success) {
        throw new Error(response.error.message);
      }
      const userData = response.data;

      const backendName = parseDisplayName(userData.displayName);
      const firebaseName = parseDisplayName(firebaseUser.displayName);
      const typedUserData = userData as {
        permissions?: string[];
        isSuperAdmin?: boolean;
        groupId?: string;
        groupName?: string;
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
        groupId: typedUserData.groupId,
        groupName: typedUserData.groupName,
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
  }, [ensureBackendUser]);

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

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const firebaseUser = await firebaseSignInWithGoogle();

      // Call the login endpoint to create/update the user in Firestore
      const idToken = await firebaseUser.getIdToken();
      await api.login(idToken);

      const authUser = await fetchUserData(firebaseUser);
      setUser(authUser);

      // Redirect to the page they were trying to access, or dashboard
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchUserData, setUser, setLoading, setError, navigate, location.state]);

  // Sign out
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut();
      clearAuth();
      navigate('/login', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clearAuth, setLoading, setError, navigate]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await api.getMe();
      if (!response.success) {
        throw new Error(response.error.message);
      }
      const userData = response.data;
      const { firstName, lastName } = parseDisplayName(userData.displayName);
      const typedUserData = userData as {
        permissions?: string[];
        isSuperAdmin?: boolean;
        groupId?: string;
        groupName?: string;
      };
      setUser({
        ...user,
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        permissions: typedUserData.permissions || user.permissions,
        isSuperAdmin: typedUserData.isSuperAdmin ?? user.isSuperAdmin,
        groupId: typedUserData.groupId ?? user.groupId,
        groupName: typedUserData.groupName ?? user.groupName,
      });
    } catch (err) {
      console.error('Failed to refresh user:', err);
    } finally {
      setLoading(false);
    }
  }, [user, setUser, setLoading]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    signInWithGoogle,
    signOut,
    refreshUser,
  };
}

export default useAuth;
