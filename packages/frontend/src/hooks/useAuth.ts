import { api } from '@/api';
import {
  type FirebaseUser,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOut as firebaseSignOut,
  onAuthChange,
} from '@/lib/firebase';
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
  const displayName = firebaseUser.displayName || '';
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

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

  // Fetch full user data from backend
  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser): Promise<AuthUser> => {
    try {
      const response = await api.getMe();
      if (!response.success) {
        throw new Error(response.error.message);
      }
      const userData = response.data;

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        firstName:
          userData.displayName?.split(' ')[0] || parseFirebaseUser(firebaseUser).firstName || '',
        lastName:
          userData.displayName?.split(' ').slice(1).join(' ') ||
          parseFirebaseUser(firebaseUser).lastName ||
          '',
        permissions: (userData as { permissions?: string[] }).permissions || [],
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
  }, []);

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
      setUser({
        ...user,
        firstName: userData.displayName?.split(' ')[0] || user.firstName,
        lastName: userData.displayName?.split(' ').slice(1).join(' ') || user.lastName,
        permissions: (userData as { permissions?: string[] }).permissions || user.permissions,
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
