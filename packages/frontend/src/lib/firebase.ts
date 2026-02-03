import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  type User as FirebaseUser,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  connectAuthEmulator,
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.PUBLIC_FIREBASE_APP_ID || '',
};

// Initialize Firebase only if not already initialized
let app: FirebaseApp;
let auth: Auth;

function initializeFirebase(): { app: FirebaseApp; auth: Auth } {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0] as FirebaseApp;
  }
  auth = getAuth(app);

  // Connect to emulator in development
  if (process.env.NODE_ENV === 'development') {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    } catch {
      // Already connected
    }
  }

  return { app, auth };
}

// Initialize on module load
const firebase = initializeFirebase();
export { firebase };
export const firebaseAuth = firebase.auth;

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Sign in with email and password (for emulator testing)
 */
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return result.user;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(firebaseAuth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Get the current user's ID token
 */
export async function getIdToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    return null;
  }
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting ID token:', error);
    throw error;
  }
}

/**
 * Get the current user's ID token, forcing a refresh
 */
export async function getIdTokenForced(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    return null;
  }
  try {
    return await user.getIdToken(true);
  } catch (error) {
    console.error('Error refreshing ID token:', error);
    throw error;
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth, callback);
}

/**
 * Get the current Firebase user
 */
export function getCurrentUser(): FirebaseUser | null {
  return firebaseAuth.currentUser;
}

/**
 * Wait for auth to be initialized
 */
export function waitForAuth(): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Type exports
export type { FirebaseUser };
