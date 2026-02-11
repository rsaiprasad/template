/**
 * Playwright test fixtures for Firebase Auth emulator authentication.
 *
 * Uses the Firebase Auth emulator's REST endpoints to create a test user,
 * sign in via the emulator, then inject the resulting Firebase auth state
 * into the browser's IndexedDB so the app treats the session as authenticated.
 */

import { type Page, test as base } from '@playwright/test';

// Firebase Auth Emulator endpoint
const AUTH_EMULATOR = 'http://localhost:9099';
// The Firebase project ID used by the emulators
const PROJECT_ID = 'admin-dash-template';
// Backend API via Cloud Functions emulator
const API_BASE = `http://localhost:5001/${PROJECT_ID}/us-central1/api/api/v1`;
// Firebase Web API key (emulator accepts any value, but we need one for REST calls)
const API_KEY = 'fake-api-key';

interface TestUser {
  uid: string;
  email: string;
  displayName: string;
  idToken: string;
  refreshToken: string;
}

/**
 * Create a test user in the Firebase Auth emulator and get tokens
 */
async function createEmulatorUser(email: string, displayName: string): Promise<TestUser> {
  // Step 1: Create account via emulator's signUp endpoint
  const signUpRes = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'testpassword123',
        displayName,
        returnSecureToken: true,
      }),
    }
  );

  if (!signUpRes.ok) {
    // User might already exist — try signing in instead
    const signInRes = await fetch(
      `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'testpassword123',
          returnSecureToken: true,
        }),
      }
    );

    if (!signInRes.ok) {
      const errText = await signInRes.text();
      throw new Error(`Failed to sign in existing user: ${errText}`);
    }

    const signInData = await signInRes.json();
    return {
      uid: signInData.localId,
      email: signInData.email,
      displayName,
      idToken: signInData.idToken,
      refreshToken: signInData.refreshToken,
    };
  }

  const signUpData = await signUpRes.json();

  // Step 2: Update the profile to set displayName
  await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: signUpData.idToken,
      displayName,
      returnSecureToken: true,
    }),
  });

  return {
    uid: signUpData.localId,
    email: signUpData.email || email,
    displayName,
    idToken: signUpData.idToken,
    refreshToken: signUpData.refreshToken,
  };
}

/**
 * Register the test user with the backend (call /auth/login endpoint)
 * so the user document exists in Firestore emulator
 */
async function registerWithBackend(idToken: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Backend login failed: ${errText}`);
  }
}

/**
 * Inject Firebase auth state into the browser so the app picks up
 * the authenticated session. Firebase Auth SDK stores state in IndexedDB.
 */
async function injectAuthState(page: Page, user: TestUser): Promise<void> {
  // Firebase Auth SDK stores auth state in IndexedDB under
  // the database "firebaseLocalStorageDb" with object store "firebaseLocalStorage"
  // The key pattern is: firebase:authUser:<apiKey>:<appName>

  // Navigate to the app origin first so we can access its storage
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  // Inject auth state via the Firebase Auth emulator's session persistence.
  // We inject a serialized Firebase user into sessionStorage where the Zustand
  // auth store persists its state.
  await page.evaluate(
    ({ user: u }) => {
      // Set the Zustand auth store state in sessionStorage
      // The store key is 'auth-storage' (from auth-store.ts persist config)
      const authState = {
        state: {
          user: {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: null,
            firstName: u.displayName.split(' ')[0] || '',
            lastName: u.displayName.split(' ').slice(1).join(' ') || '',
            permissions: [],
            isSuperAdmin: false,
          },
          isAuthenticated: true,
        },
        version: 0,
      };
      sessionStorage.setItem('auth-storage', JSON.stringify(authState));
    },
    { user }
  );

  // Now we also need to sign in via the Firebase Auth SDK in the browser
  // so that subsequent API calls get valid tokens.
  await page.evaluate(
    async ({ email, password, emulatorUrl, apiKey }) => {
      // Use the Firebase Auth REST API from the browser to sign in
      const res = await fetch(
        `${emulatorUrl}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );
      if (!res.ok) {
        throw new Error(`Browser sign-in failed: ${await res.text()}`);
      }
    },
    {
      email: user.email,
      password: 'testpassword123',
      emulatorUrl: AUTH_EMULATOR,
      apiKey: API_KEY,
    }
  );
}

/**
 * Clear all emulator data (users, firestore docs, etc.)
 */
async function clearEmulatorData(): Promise<void> {
  try {
    // Clear Auth emulator
    await fetch(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
      method: 'DELETE',
    });
  } catch {
    // Emulator might not be running
  }

  try {
    // Clear Firestore emulator
    await fetch(
      `http://localhost:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
      { method: 'DELETE' }
    );
  } catch {
    // Emulator might not be running
  }
}

// Test user credentials
const SUPER_ADMIN_EMAIL = 'admin@test.com';
const SUPER_ADMIN_NAME = 'Test Admin';
const REGULAR_USER_EMAIL = 'user@test.com';
const REGULAR_USER_NAME = 'Test User';

export interface AuthFixtures {
  superAdminUser: TestUser;
  regularUser: TestUser;
  authenticatedPage: Page;
  loginAsSuperAdmin: () => Promise<void>;
  loginAsRegularUser: () => Promise<void>;
}

/**
 * Extended test fixture that provides authenticated page states
 */
export const test = base.extend<AuthFixtures>({
  superAdminUser: async ({}, use) => {
    const user = await createEmulatorUser(SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME);
    await registerWithBackend(user.idToken);
    await use(user);
  },

  regularUser: async ({}, use) => {
    const user = await createEmulatorUser(REGULAR_USER_EMAIL, REGULAR_USER_NAME);
    await registerWithBackend(user.idToken);
    await use(user);
  },

  authenticatedPage: async ({ page, superAdminUser }, use) => {
    await injectAuthState(page, superAdminUser);
    await use(page);
  },

  loginAsSuperAdmin: async ({ page, superAdminUser }, use) => {
    await use(async () => {
      await injectAuthState(page, superAdminUser);
    });
  },

  loginAsRegularUser: async ({ page, regularUser }, use) => {
    await use(async () => {
      await injectAuthState(page, regularUser);
    });
  },
});

export { expect } from '@playwright/test';
export { clearEmulatorData, createEmulatorUser, registerWithBackend };
export type { TestUser };
