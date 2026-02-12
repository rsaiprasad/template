import { type App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';

let app: App;
let auth: Auth;

/**
 * Initialize the Firebase Admin SDK
 * Uses application default credentials in Cloud Functions environment
 * or service account credentials for local development
 */
export function initializeFirebaseAdmin(): App {
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  // Check if running in Firebase/GCP environment with default credentials
  if (process.env.FIREBASE_CONFIG || process.env.GCLOUD_PROJECT) {
    app = initializeApp();
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Local development with service account file
    // cert() accepts a file path string directly, no need to cast
    app = initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    });
  } else {
    // Fallback: initialize without credentials (for emulator)
    app = initializeApp({
      projectId: process.env.GCLOUD_PROJECT || 'demo-project',
    });
  }

  return app;
}

/**
 * Get the Firebase Admin App instance
 */
export function getApp(): App {
  if (!app) {
    initializeFirebaseAdmin();
  }
  return app;
}

/**
 * Get the Firebase Auth Admin instance
 */
export function getAuthAdmin(): Auth {
  if (!auth) {
    auth = getAuth(getApp());
  }
  return auth;
}
