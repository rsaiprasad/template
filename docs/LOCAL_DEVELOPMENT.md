# Local Development Guide

This guide covers setting up and running the development environment locally.

## Prerequisites

### Required Software

1. **Bun** (v1.1.0 or later)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **PostgreSQL** (v14 or later)
   ```bash
   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib
   sudo systemctl enable postgresql
   sudo systemctl start postgresql
   ```

3. **Firebase CLI** (v13.0.0 or later) -- for the Auth emulator
   ```bash
   npm install -g firebase-tools
   ```

4. **Java Runtime** (required for Firebase Auth emulator)
   - Java 11 or later
   - Check with: `java -version`

### Project Setup

1. Install dependencies from the project root:
   ```bash
   bun install
   ```

2. Set up PostgreSQL database and generate `.env` files:
   ```bash
   ./infrastructure/scripts/setup-local.sh
   ```

   This interactive script will:
   - Check that PostgreSQL is running
   - Create a database user and database
   - Generate `packages/backend/.env` with `DATABASE_URL`
   - Run Drizzle migrations to create tables

3. Configure the super admin email in `packages/backend/.env`:
   ```
   SUPER_ADMIN_EMAIL=your-email@example.com
   ```
   The user who signs in with this email is automatically granted super admin privileges.

4. (Optional) Configure frontend environment variables:
   ```bash
   cp packages/frontend/.env.example packages/frontend/.env
   ```

   > When using the Firebase Auth emulator in development, the frontend env vars are not strictly required -- the emulator does not validate Firebase config values.

---

## Starting the Development Environment

### Option 1: Full Development Environment (Recommended)

Run everything at once:

```bash
bun run dev:full
```

This starts:
1. Firebase Auth emulator (port 9099)
2. Backend Bun server (port 3000)
3. Frontend dev server (port 5173) with API proxy to port 3000
4. AI service (port 3001, if configured with `GEMINI_API_KEY`)

Once running:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/v1
- **Swagger**: http://localhost:3000/api/v1/swagger
- **Auth Emulator**: http://localhost:9099

### Option 2: Individual Services

Start services individually for focused development:

```bash
# Backend only
bun run dev:backend

# Frontend only (assumes backend is running on port 3000)
bun run dev:frontend

# Both frontend and backend (no Auth emulator)
bun run dev
```

### Development Ports

| Service | Port |
|---------|------|
| Backend (Bun server) | 3000 |
| Frontend (dev server) | 5173 |
| Firebase Auth emulator | 9099 |
| AI service (optional) | 3001 |

---

## Firebase Auth Emulator

The Firebase Auth emulator provides Google OAuth simulation for local development. No real Firebase project is needed for development.

### How It Works

- The `dev.sh` script starts the Auth emulator automatically
- The backend and frontend detect `NODE_ENV=development` and connect to the emulator at `http://localhost:9099`
- No real Firebase credentials are needed in development

### Project ID

The project uses a `demo-` prefixed project ID configured in `.firebaserc`:

```json
{
  "projects": {
    "default": "demo-ccvpool-test"
  }
}
```

`demo-*` project IDs are special emulator-only projects that do **not** require a real Firebase project. The emulator runs in fully offline mode.

> **Note**: Do not use `firebase use <project-id>` with `demo-` prefixed IDs -- it validates against real projects and will reject them. The `dev.sh` script reads `.firebaserc` directly.

### Signing In

1. Navigate to http://localhost:5173/login
2. Click **Continue with Google**
3. The emulator shows a popup to select or create a test user
4. Sign in with any email -- the user is created in the emulator and the backend

### Test Users

Create multiple users for testing different permission levels:

| User Type | Suggested Email | Purpose |
|-----------|-----------------|---------|
| Super Admin | `admin@test.com` | Full access (set as `SUPER_ADMIN_EMAIL`) |
| Manager | `manager@test.com` | User and group management |
| Viewer | `viewer@test.com` | Read-only access |
| New User | `newuser@test.com` | No permissions (default state) |

---

## Database (PostgreSQL)

### Schema Management

The database schema is defined in `packages/backend/src/db/schema.ts` using Drizzle ORM.

```bash
cd packages/backend

# Push schema changes directly to database (recommended for dev)
bun run db:push

# Generate migration files
bun run db:generate

# Run pending migrations
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio
```

### Data Persistence

Unlike Firebase emulators, PostgreSQL data persists across restarts. To reset the database:

```bash
# Drop and recreate
sudo -u postgres dropdb admin_dashboard
sudo -u postgres createdb admin_dashboard -O admin_user
cd packages/backend && bun run db:push
```

### Inspecting Data

Use Drizzle Studio for a web-based database GUI:

```bash
cd packages/backend
bun run db:studio
```

Or connect directly with `psql`:

```bash
psql -U admin_user -d admin_dashboard
```

---

## Manual Testing Checklist

### Authentication Flow

- [ ] Visit http://localhost:5173/login -- login page displays correctly
- [ ] Click "Continue with Google" -- emulator popup appears
- [ ] Sign in -- redirect to dashboard
- [ ] Try accessing /users while logged out -- redirected to login
- [ ] Sign out -- redirected to login page

### Dashboard

- [ ] After signing in, dashboard loads with user greeting
- [ ] Quick action links work (Manage Users, Groups, Audit Logs)

### Users Management

- [ ] Navigate to /users -- users table loads
- [ ] Search and filter work
- [ ] Click a user to view details
- [ ] Edit user, add/remove groups (requires appropriate permissions)

### Groups Management

- [ ] Navigate to /groups -- groups table loads
- [ ] Create a new group with selected permissions
- [ ] Edit group permissions
- [ ] Delete a non-default group

### Permissions System

- [ ] Sign in as a user without `users:read` -- /users shows forbidden
- [ ] UI elements (Add User, Create Group) are hidden without permissions
- [ ] Super Admin sees everything

### Audit Logs

- [ ] Navigate to /audit-logs -- entries display
- [ ] Perform an action (edit user) and verify it appears in audit logs

### Settings

- [ ] Navigate to /settings -- page loads
- [ ] Theme toggle works (light/dark/system)

---

## Hot Reload

- **Frontend**: The Bun-based dev server supports hot module replacement. Changes to React components are reflected immediately.
- **Backend**: The backend runs with `bun --watch`, automatically restarting on file changes.

---

## Running Tests

```bash
# All tests
bun run test

# Unit tests only
bun run test:unit

# Type checking
bun run typecheck

# Linting
bun run lint

# E2E tests (requires dev server running)
cd packages/frontend
bun run e2e
```

---

## See Also

- [Configuration](./CONFIGURATION.md) -- environment variables reference
- [Extending](./EXTENDING.md) -- how to add new features
- [Troubleshooting](./TROUBLESHOOTING.md) -- common issues and fixes
