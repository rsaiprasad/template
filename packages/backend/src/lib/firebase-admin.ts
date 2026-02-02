import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore, Timestamp } from 'firebase-admin/firestore';

let app: App;
let auth: Auth;
let db: Firestore;

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
    app = initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as unknown as ServiceAccount),
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

/**
 * Get the Firestore instance
 */
export function getDb(): Firestore {
  if (!db) {
    db = getFirestore(getApp());
  }
  return db;
}

/**
 * Firestore collection names
 */
export const Collections = {
  USERS: 'users',
  GROUPS: 'groups',
  AUDIT_LOGS: 'auditLogs',
  SETTINGS: 'settings',
} as const;

/**
 * Firestore timestamp conversion utilities
 */
export function toFirestoreTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

export function fromFirestoreTimestamp(
  timestamp: Timestamp | undefined | null
): Date | undefined {
  if (!timestamp) return undefined;
  return timestamp.toDate();
}

/**
 * Convert Firestore document data to typed object with Date conversions
 */
export function convertFirestoreDoc<T>(
  doc: FirebaseFirestore.DocumentSnapshot
): T | null {
  if (!doc.exists) return null;

  const data = doc.data()!;
  const result: Record<string, unknown> = { id: doc.id };

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'toDate' in value) {
      result[key] = (value as Timestamp).toDate();
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Convert array of Firestore documents
 */
export function convertFirestoreDocs<T>(
  snapshot: FirebaseFirestore.QuerySnapshot
): T[] {
  return snapshot.docs
    .map((doc) => convertFirestoreDoc<T>(doc))
    .filter((doc): doc is T => doc !== null);
}
