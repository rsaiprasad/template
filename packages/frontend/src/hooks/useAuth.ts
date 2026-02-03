import { api } from '@/api';
import {
  type FirebaseUser,
  signInWithGoogle as firebaseSignInWithGoogle,
  signInWithEmail as firebaseSignInWithEmail,
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
  signInWithEmail: (email: string, password: string) => Promise<void>;
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

  // Fetch full user data from backend
  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser): Promise<AuthUser> => {
    try {
      const response = await api.getMe();
      if (!response.success) {
        throw new Error(response.error.message);
      }
      const userData = response.data;

      const backendName = parseDisplayName(userData.displayName);
      const firebaseName = parseDisplayName(firebaseUser.displayName);
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        firstName: backendName.firstName || firebaseName.firstName,
        lastName: backendName.lastName || firebaseName.lastName,
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

  // Sign in with email/password (for emulator testing)
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const firebaseUser = await firebaseSignInWithEmail(email, password);
      const authUser = await fetchUserData(firebaseUser);
      setUser(authUser);

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
      setUser({
        ...user,
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
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
    signInWithEmail,
    signOut,
    refreshUser,
  };
}

export default useAuth;
