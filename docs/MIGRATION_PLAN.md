# Brainstorm: Hybrid Desktop + Cloudflare Architecture

## Context
Run this admin dashboard as a personal project without unnecessary cloud costs. Static frontend on Cloudflare Pages (free), backend + database on desktop, exposed via Cloudflare Tunnel, with Google OAuth for auth.

## Feasibility: Yes, absolutely possible

The codebase is well-structured for this migration. Key insight: **the Hono app is already runtime-agnostic** — only the Firebase Functions export wrapper (`onRequest`) ties it to GCP. The frontend talks exclusively through API endpoints, never directly to Firestore.

---

## Recommended Architecture

```
Browser → Cloudflare Pages (frontend static files)
       → Cloudflare Tunnel → Desktop Bun server (Hono API)
                            → PostgreSQL (local)
       → Firebase Auth (free tier, Google OAuth)
```

### Why keep Firebase Auth (free tier)?
- Firebase Auth's Google sign-in is **completely free** — no usage limits for authentication
- Avoids rebuilding OAuth flow, token management, session handling
- Frontend keeps its existing `signInWithPopup` → ID token flow
- Backend keeps `verifyIdToken()` — just needs firebase-admin SDK initialized (no Firestore needed)
- **Zero cost, maximum code reuse**

### What changes

| Component | Current | New | Effort |
|-----------|---------|-----|--------|
| Frontend hosting | Firebase Hosting | Cloudflare Pages | Low — just deploy static files |
| Backend runtime | Firebase Cloud Functions | Bun server on desktop | Low — remove `onRequest` wrapper |
| Backend exposure | GCP HTTPS | Cloudflare Tunnel | Low — `cloudflared` daemon |
| Database | Cloud Firestore | PostgreSQL (local) | **High** — 98 operations to rewrite |
| Auth | Firebase Auth | Firebase Auth (keep!) | None — free tier |
| AI Service | Cloud Run | Local Bun process | Low — remove Cloud Run wrapper |

---

## Migration Plan (4 phases)

### Phase 1: Backend → Standalone Bun Server (1 day)

**Files to change:**
- `packages/backend/src/index.ts` — Remove `onRequest` wrapper, export Hono app with `Bun.serve()` or `export default app`
- `packages/backend/build.ts` — Change target to Bun, output ESM instead of CJS
- `packages/backend/package.json` — Remove `firebase-functions` dependency, add start script

**What stays the same:** All routes, middleware, services, auth verification.

The Hono app already handles all HTTP logic. Firebase Functions is just a wrapper around `app.fetch()`.

### Phase 2: Firestore → PostgreSQL with Drizzle ORM (1-2 weeks)

This is the bulk of the work. **98 Firestore operations** across 4 services need SQL equivalents.

**Approach: Repository pattern abstraction**

1. Create `packages/backend/src/db/schema.ts` — Drizzle schema for 4 tables:
   - `users` (id, email, displayName, photoURL, status, settings JSONB, timestamps) + junction table `user_groups`
   - `groups` (id, name, description, permissions TEXT[], isDefault, timestamps)
   - `audit_logs` (id, action, resource, resourceId, actorId, actorEmail, details JSONB, timestamp)
   - `settings` (id, key-value or single row with JSONB columns)

2. Create repository files per service:
   - `packages/backend/src/db/repositories/user.repository.ts`
   - `packages/backend/src/db/repositories/group.repository.ts`
   - `packages/backend/src/db/repositories/audit.repository.ts`
   - `packages/backend/src/db/repositories/settings.repository.ts`

3. Rewrite each service method to use Drizzle queries instead of Firestore calls

**Why PostgreSQL + Drizzle:**
- PostgreSQL = full-featured relational DB, native array types, JSONB, full-text search
- Drizzle = type-safe, lightweight ORM, excellent PostgreSQL support
- Proper JOIN support for user-group relationships (junction table instead of JSON array)
- Native array columns for permissions (`TEXT[]`) — cleaner than JSON
- `pg_dump` for backups, replication-ready if you ever need it
- Runs locally via `apt install postgresql` or Docker

**Schema mapping (Firestore → PostgreSQL):**
- `doc.id` → `id TEXT PRIMARY KEY` (UUID or nanoid)
- `array-contains` queries → `user_groups` junction table with proper JOINs
- `FieldValue.serverTimestamp()` → `DEFAULT NOW()`
- Firestore transactions → PostgreSQL transactions (ACID-compliant)
- Firestore batch writes → PostgreSQL transactions
- JSON fields → `JSONB` columns with indexing support

### Phase 3: Frontend → Cloudflare Pages (1 day)

**Files to change:**
- `packages/frontend/.env` — Point API URL to Cloudflare Tunnel domain
- Remove Firebase Hosting config from `firebase.json`
- Add `wrangler.toml` or use Cloudflare Pages dashboard for deploy

**Build stays the same** — `bun run build:frontend` produces static files in `dist/`.
Cloudflare Pages just serves them.

**CORS config** — Update backend CORS to allow Cloudflare Pages domain.

### Phase 4: Cloudflare Tunnel Setup (1 hour)

1. Install `cloudflared` on desktop
2. Create tunnel: `cloudflared tunnel create admin-dashboard`
3. Configure to route traffic to `localhost:3000` (Bun server)
4. Run as system service for always-on access

**Optional:** Use Cloudflare Access (free for up to 50 users) for an extra auth layer.

---

## What you keep for free

- **Firebase Auth** — Google sign-in, token verification, completely free
- **Firebase project** — Keep it just for auth (free tier, no Firestore/Functions usage)
- **Cloudflare Pages** — Free tier: unlimited sites, 500 builds/month
- **Cloudflare Tunnel** — Free for personal use
- **PostgreSQL** — Free, runs on your desktop
- **Bun server** — Free, runs on your desktop

**Total monthly cost: $0**

---

## Trade-offs to consider

| Concern | Impact | Mitigation |
|---------|--------|------------|
| Desktop must be on for backend to work | Can't access when desktop is off | Wake-on-LAN, or accept the limitation |
| No automatic scaling | N/A for personal project | You're the only user |
| No managed backups | Database could be lost | `pg_dump` cron job to backup, or push to cloud storage |
| Cloudflare Tunnel latency | Extra hop through Cloudflare network | Usually <50ms added, negligible for personal use |
| Firebase Auth still requires internet | Offline auth won't work | Acceptable — you need internet anyway for Cloudflare |

---

## Implementation order recommendation

1. **Phase 1 first** — Get Bun server running standalone (quick win, validates approach)
2. **Phase 2 next** — Database migration (biggest piece, do it methodically service by service)
3. **Phase 3 + 4 together** — Frontend deploy + tunnel (can do in parallel once backend works)

### Verification
- Run `bun run dev` with new standalone server, verify all API endpoints work
- Run existing unit tests against PostgreSQL-backed services
- Deploy frontend to Cloudflare Pages, verify it connects through tunnel
- Test full auth flow: Google sign-in → token → API calls → data persistence

---

## PostgreSQL Setup on Desktop

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb admin_dashboard
sudo -u postgres createuser --password your_user

# Connection string for Drizzle
DATABASE_URL=postgresql://your_user:password@localhost:5432/admin_dashboard
```

Or via Docker:
```bash
docker run -d --name admin-db \
  -e POSTGRES_DB=admin_dashboard \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:17
```

---

## Firebase Dependency Analysis

### Current coupling by layer

| Layer | Firebase Auth | Firestore | Firebase Functions | Coupling |
|-------|---------------|-----------|-------------------|----------|
| **Backend** | 10 call sites (verifyIdToken, getUser, updateUser, deleteUser) | 98 operations across 4 services | Export wrapper only | HIGH |
| **Frontend** | Auth UI only (signInWithPopup, signOut, getIdToken, onAuthStateChanged) | None | None | MEDIUM |
| **AI Service** | 1 call (verifyIdToken) | None | None | LOW |

### Firestore operations by service

| Service | Operations | Key Collections |
|---------|------------|-----------------|
| `user.service.ts` | 38 | users, groups, settings |
| `group.service.ts` | 26 | groups, users, settings |
| `audit.service.ts` | 15 | auditLogs |
| `settings.service.ts` | 10 | settings, groups |
| `migration.ts` | 4 | users |
| `auth middleware` | 4 | users, groups |
| `auth routes` | 4 | groups, users |
