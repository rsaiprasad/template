# Configuration

## Environment Variables

### Root `.env` (Backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key | `./service-account.json` |
| `SUPER_ADMIN_EMAIL` | Email that receives super admin on first login | `admin@company.com` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |

> **Note:** The Firebase project ID is defined in `firebase/.firebaserc` (single source of truth). The Firebase Admin SDK auto-detects the project from the service account credentials or emulator environment.

### Frontend `.env` (`packages/frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_API_BASE_URL` | API base URL (relative in prod) | `/api` |
| `PUBLIC_FIREBASE_API_KEY` | Firebase API key | `AIzaSy...` |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` |
| `PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `my-dashboard-app` |
| `PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `project.appspot.com` |
| `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789` |
| `PUBLIC_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc` |

## CORS

CORS origins are configured in the backend. In production, set via Firebase Functions config:

```bash
firebase functions:config:set cors.origins="https://your-domain.com"
firebase deploy --only functions
```

Ensure your domain is also listed in Firebase Console > Authentication > Settings > Authorized domains.

## Rate Limiting

Default limits (configured in backend):

| Scope | Limit |
|-------|-------|
| General API | 100 requests/min per IP |
| Auth endpoints | 10 requests/min per IP |

## Firebase Project ID

The project ID is set in `firebase/.firebaserc` and is the single source of truth:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

The Firebase Admin SDK, CLI, and emulators all read from this file. You do **not** need to set the project ID as an environment variable.
