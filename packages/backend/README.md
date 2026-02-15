# Admin Dashboard Backend

Hono-based REST API with OpenAPI 3.1 specification, running as a standalone Bun server.

## Tech Stack

- **Framework**: Hono (OpenAPI)
- **Runtime**: Bun (standalone server)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth (Google OAuth, token verification only)
- **Validation**: Zod
- **API Spec**: OpenAPI 3.1

## Project Structure

```
src/
├── core/                   # Template infra (DON'T EDIT)
│   ├── errors/
│   │   └── index.ts        # Custom error classes
│   ├── middleware/
│   │   ├── auth.ts         # Authentication middleware
│   │   ├── permissions.ts  # Authorization middleware
│   │   ├── rate-limit.ts   # Rate limiting
│   │   └── audit.ts        # Audit logging middleware
│   ├── lib/
│   │   └── firebase-admin.ts # Firebase Auth Admin SDK setup
│   ├── utils/
│   │   └── response.ts     # Response helpers
│   ├── types/
│   │   └── context.ts      # Hono context types
│   └── index.ts            # Barrel export for core
│
├── config/
│   └── index.ts            # Environment configuration
│
├── db/
│   ├── index.ts            # Drizzle database connection
│   └── schema.ts           # PostgreSQL schema (Drizzle ORM)
│
├── routes/                 # Route handlers
│   ├── auth.ts
│   ├── users.ts
│   ├── groups.ts
│   ├── permissions.ts
│   ├── settings.ts
│   └── audit.ts
│
├── services/               # Business logic
│   ├── user.service.ts
│   ├── group.service.ts
│   ├── audit.service.ts
│   ├── settings.service.ts
│   └── index.ts            # Singleton instances
│
├── app.ts                  # Main Hono app
└── index.ts                # Bun server entry point
```

## Development

### Prerequisites

- Bun v1.0+
- PostgreSQL v14+
- Firebase CLI (for Auth emulator in development)

### Setup

```bash
# Install dependencies (from monorepo root)
bun install

# Set up PostgreSQL and generate .env
./infrastructure/scripts/setup-local.sh

# Or manually:
cp .env.example .env
# Edit .env with your database URL and super admin email
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://admin_user:admin_local_dev@localhost:5432/admin_dashboard

# Firebase Admin SDK (not required with Auth emulator in dev)
GOOGLE_APPLICATION_CREDENTIALS=./firebase-sa-key.json

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:5173,https://admin.yourdomain.com

# Super Admin (user with this email is granted super admin on login)
SUPER_ADMIN_EMAIL=admin@example.com

# Environment
NODE_ENV=development
```

### Commands

```bash
# Start development server with watch
bun run dev

# Type checking
bun run typecheck

# Build for production
bun run build

# Run tests
bun run test

# Database commands
bun run db:push      # Push schema changes to PostgreSQL
bun run db:generate  # Generate migration files
bun run db:migrate   # Run pending migrations
bun run db:studio    # Open Drizzle Studio (database GUI)
```

### API Documentation

When running locally, three endpoints serve the API spec:

| URL | Description |
|-----|-------------|
| `http://localhost:3000/api/v1/explorer` | **API Explorer** — Scalar UI with built-in Google Sign-In. Sign in once and all "Try it" requests include your Bearer token automatically. |
| `http://localhost:3000/api/v1/swagger` | Swagger UI — quick spec viewer, no auth integration. |
| `http://localhost:3000/api/v1/doc` | Raw OpenAPI 3.1 JSON spec. |

#### API Explorer Setup

The Explorer loads Firebase Auth from CDN for Google Sign-In. It reads these env vars from the backend's `.env`:

```env
# Copy these from packages/frontend/.env (same Firebase project)
PUBLIC_FIREBASE_API_KEY=AIzaSy...
PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

In development with `bun run dev:full`, the Auth Emulator is started automatically and `FIREBASE_AUTH_EMULATOR_HOST` is set — the Explorer detects this and connects to the emulator for sign-in.

**To test the Explorer:**

1. Start the full dev environment: `bun run dev:full` (from monorepo root)
2. Open `http://localhost:3000/api/v1/explorer`
3. Click **Sign in with Google** — you'll be redirected to the Auth Emulator
4. Pick an existing account or add a new one, then click **Sign in with Google.com**
5. You're redirected back to the Explorer, now authenticated — the Bearer token is pre-filled in all request examples
6. Use **Test Request** on any endpoint (e.g. `GET /auth/me`) to make authenticated API calls

## Architecture

### Request Flow

```
Request
  │
  ▼
┌─────────────────┐
│   Rate Limit    │  ← Blocks excessive requests
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      CORS       │  ← Config-driven origin check
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Middleware │  ← Validates Firebase token
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Permission Check │  ← Verifies user permissions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Route Handler  │  ← Business logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Audit Middleware │  ← Logs sensitive actions
└────────┬────────┘
         │
         ▼
Response
```

### Services

Services are singletons, accessed via `src/services/index.ts`:

```typescript
import { userService, groupService } from './services';
const users = await userService.listUsers({ page: 1, limit: 20 });
```

### Configuration

All config in `src/config/index.ts`:

```typescript
import { config } from './config';
config.cors.origins     // Allowed CORS origins
config.rateLimit.max    // Requests per window
```

## Security

### Authentication

All endpoints (except `/health`) require a Firebase ID token:

```
Authorization: Bearer <firebase-id-token>
```

The Firebase Admin SDK verifies the token using a service account key (`GOOGLE_APPLICATION_CREDENTIALS`). In development, the Firebase Auth emulator is used instead.

### Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| General | 100 req/min |
| Auth endpoints | 10 req/min |

### Super Admin

The super admin:
- Is determined by the `SUPER_ADMIN_EMAIL` environment variable
- Cannot be deleted or demoted
- Bypasses all permission checks

## Database

### PostgreSQL with Drizzle ORM

Schema is defined in `src/db/schema.ts`. Tables:

| Table | Description |
|-------|-------------|
| `users` | User records |
| `groups` | Permission groups |
| `user_groups` | User-to-group junction table |
| `settings` | App settings |
| `audit_logs` | Audit trail |

### Schema Management

```bash
cd packages/backend

# Push schema changes directly (recommended for dev)
bun run db:push

# Generate and run migrations (recommended for production)
bun run db:generate
bun run db:migrate

# Open database GUI
bun run db:studio
```

## Deployment

The backend runs as a systemd service, exposed to the internet via a Cloudflare Tunnel. See [DEPLOYMENT.md](../../docs/DEPLOYMENT.md) for full instructions.

```bash
# Build
bun run build

# Start (production)
bun run start
```
