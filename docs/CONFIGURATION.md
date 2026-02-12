# Configuration

## Environment Variables

### Backend (`packages/backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://admin_user:password@localhost:5432/admin_dashboard` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `SUPER_ADMIN_EMAIL` | Email that receives super admin privileges | `admin@company.com` |
| `FIREBASE_PROJECT_ID` | Firebase project ID (for Auth token verification) | `my-dashboard-app` |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK service account email | `firebase-adminsdk-xxx@project.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK private key | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `https://your-app.pages.dev,https://admin.yourdomain.com` |

> **Note:** In development, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are not required when using the Firebase Auth emulator. The `DATABASE_URL` defaults to `postgresql://admin_user:admin_local_dev@localhost:5432/admin_dashboard` if not set.

### Frontend (`packages/frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_API_BASE_URL` | Backend API base URL | `https://api.yourdomain.com/api/v1` |
| `PUBLIC_FIREBASE_API_KEY` | Firebase API key | `AIzaSy...` |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` |
| `PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `my-dashboard-app` |
| `PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `project.appspot.com` |
| `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789` |
| `PUBLIC_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc` |

> **Note:** In development with the Firebase Auth emulator, the frontend env vars are not strictly required -- the emulator does not validate Firebase config values. In production, set `PUBLIC_API_BASE_URL` to your Cloudflare Tunnel domain (e.g., `https://api.yourdomain.com/api/v1`).

### AI Service (`packages/ai-service/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Gemini API key from Google AI Studio | `AIzaSy...` |
| `AI_SYSTEM_PROMPT` | Custom system prompt (optional, replaces default) | `You are a helpful assistant for MyApp.` |

## CORS

CORS origins are configured via the `CORS_ORIGINS` environment variable in `packages/backend/.env`:

```bash
# Single origin
CORS_ORIGINS=https://admin.yourdomain.com

# Multiple origins (comma-separated)
CORS_ORIGINS=https://your-app.pages.dev,https://admin.yourdomain.com
```

In development, `localhost` origins are allowed by default.

Ensure your domain is also listed in Firebase Console > Authentication > Settings > Authorized domains (required for Google OAuth to work on that domain).

## Rate Limiting

Default limits (configured in backend):

| Scope | Limit |
|-------|-------|
| General API | 100 requests/min per IP |
| Auth endpoints | 10 requests/min per IP |

## Database Configuration

### Connection String

The `DATABASE_URL` follows the standard PostgreSQL connection string format:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

| Component | Default (dev) | Production |
|-----------|---------------|------------|
| User | `admin_user` | Your PostgreSQL user |
| Password | `admin_local_dev` | Your secure password |
| Host | `localhost` | `localhost` (accessed via Bun server on same machine) |
| Port | `5432` | `5432` |
| Database | `admin_dashboard` | Your database name |

### Drizzle Configuration

Drizzle ORM configuration is in `packages/backend/drizzle.config.ts`. It reads `DATABASE_URL` from the environment. Schema files are in `packages/backend/src/db/schema.ts`.

## Cloudflare Tunnel Configuration

The tunnel config lives at `~/.cloudflared/config.yml`. An example is provided at `infrastructure/cloudflare/tunnel-config.example.yml`:

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /home/<USER>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full tunnel setup instructions.

## Firebase Auth Configuration

Firebase Auth is used solely for Google OAuth (free tier). No Firestore or Cloud Functions are used from Firebase.

**Backend**: The Firebase Admin SDK verifies ID tokens. In production, set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` from Firebase Console > Project Settings > Service Accounts.

**Frontend**: The Firebase client SDK handles the Google OAuth flow. Get the config values from Firebase Console > Project Settings > General > Your apps > Web app.

**Development**: The Firebase Auth emulator runs on port 9099. The `dev.sh` script starts it automatically. No Firebase credentials are needed for local development.
