import { type App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { type DecodedIdToken, getAuth } from 'firebase-admin/auth';

let app: App;

function getFirebaseApp(): App {
  if (app) return app;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0]!;
    return app;
  }

  // Firebase Admin auto-initializes with GOOGLE_APPLICATION_CREDENTIALS
  // or Application Default Credentials
  const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountKey) {
    app = initializeApp({
      credential: cert(serviceAccountKey),
    });
  } else {
    app = initializeApp({
      projectId: process.env.GCLOUD_PROJECT || 'demo-project',
    });
  }

  return app;
}

export async function verifyToken(idToken: string): Promise<DecodedIdToken> {
  const firebaseApp = getFirebaseApp();
  const auth = getAuth(firebaseApp);
  return auth.verifyIdToken(idToken);
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

export async function fetchUserProfile(idToken: string, backendUrl: string): Promise<UserProfile> {
  const response = await fetch(`${backendUrl}/auth/me`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch user profile: ${response.status} ${text}`);
  }

  const body = (await response.json()) as {
    success: boolean;
    data: {
      id: string;
      email: string;
      displayName: string;
      permissions: string[];
      isSuperAdmin: boolean;
    };
  };

  if (!body.success) {
    throw new Error('Backend returned unsuccessful response for /auth/me');
  }

  return {
    uid: body.data.id,
    email: body.data.email,
    displayName: body.data.displayName,
    permissions: body.data.permissions,
    isSuperAdmin: body.data.isSuperAdmin,
  };
}
