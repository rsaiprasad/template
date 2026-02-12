# CLAUDE.md - Project Guidelines & Lessons Learned

## Session Start Checklist

**At the start of every session, read the BRD for full application context:**
- **BRD**: `docs/BRD.md` — the authoritative requirements document
- **Custom permissions**: `packages/shared/src/constants/permissions.ts` — where developers add app-specific permissions
- **Core permissions**: `packages/backend/src/core/permissions.ts` — template's built-in permissions (don't edit)
- **Shared types**: `packages/shared/src/types/` — type definitions used across backend and frontend

## Application Context

This is an **Admin Dashboard Template** — a reusable foundation for B2C/B2B SaaS apps. Key architecture decisions:

### Permission System
- **Core permissions** (users, groups, audit) are defined in `packages/backend/src/core/permissions.ts` — template infrastructure, don't edit
- **Custom permissions** are added by developers in `packages/shared/src/constants/permissions.ts` (`CUSTOM_PERMISSIONS` record) — these auto-merge with core permissions and appear in the Group Management UI
- **Permission types** are in `packages/shared/src/core/types/permission.ts`: `CorePermission` (strict union of template permissions), `Permission` (extensible with `string & {}` for custom permissions)
- **Groups are stored in PostgreSQL** (`groups` table) with assigned permission strings (JSONB array)
- **User-group relationships** use a `user_groups` junction table for many-to-many mapping
- **Super Admin** is determined by `SUPER_ADMIN_EMAIL` env var (not first login) and bypasses all permission checks
- Backend enforces permissions via middleware (`requirePermission`); frontend conditionally renders via `user.permissions` array

### Auth
- Google OAuth only (no email/password) — even in dev mode with emulators
- Firebase Auth is used solely for Google OAuth (free tier) — no Firestore or Cloud Functions
- Firebase Auth emulator shows a Google sign-in popup for test users

### Admin Screens
- **User Management** (`/users`): list users, multi-group assignments (add/remove groups), disable/enable/delete
- **Group Management** (`/groups`): create/edit/delete groups, assign permissions, set default group

### Multi-Group Model
- Users belong to multiple groups via the `user_groups` junction table
- Permissions are **merged** from all assigned groups (union of all group permissions)
- Add/remove group endpoints: `POST /users/:id/groups/add`, `POST /users/:id/groups/remove`

---

## Definition of Done

**No code change is complete until ALL related tests pass.** When making any change:

1. **Run the relevant test suite** for every layer affected by the change (unit, integration, e2e).
2. **Do not claim work is done if any test is skipped or disabled for the changed code path.**

### Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Run tests, check logs, demonstrate correctness

### End-to-End Verification After Structural Changes
After completing any non-trivial implementation (especially restructuring, refactoring, or multi-file changes), kick off **two parallel subagents** before marking the work as done:

1. **E2E test subagent** — Start `bun run dev:full`, wait for emulators + servers, then use Playwright (browser MCP tools) to verify the app works end-to-end: sign in, navigate admin menus (Users, Groups, Audit Logs), verify pages load without errors, check browser console for runtime errors.

2. **Documentation update subagent** — Review all documentation files (`CLAUDE.md`, `README.md`, `docs/*.md`, `TEMPLATE_CHANGELOG.md`) to ensure they accurately reflect the current state of the codebase. Fix any stale references, outdated paths, or missing information.

Both subagents run in parallel. Don't mark the task complete until both pass.

---

## Workflow

### Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building

### Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution

### Self-Improvement Loop
- After ANY correction from the user: update `CLAUDE.md` with the pattern
- Write rules for yourself that prevent the same mistake

### Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Project-Specific Lessons

### Lesson 1: Always Build and Test Before Claiming Done
**Mistake**: Committed code claiming it was complete without running `bun install`, `bun run typecheck`, or testing in a browser.
**Rule**: Before marking ANY implementation task as complete: install deps, typecheck, lint, start dev server, verify in browser.

### Lesson 2: Type Definitions Must Match Across Packages
**Mistake**: Frontend code expected different property names than the shared types.
**Rule**: Define types in shared package FIRST, use those exact types in both frontend and backend, run typecheck across all packages.

### Lesson 3: ApiResponse Type Narrowing Required
**Rule**: Always narrow ApiResponse before accessing data:
```typescript
const response = await api.getUser(id);
if (!response.success) {
  throw new Error(response.error.message);
}
const user = response.data;
```

### Lesson 4: Git Commits Must Be Checked for Sensitive Data
**Rule**: Before EVERY git commit, run `git diff --cached` and search for API keys, secrets, emails, project IDs. Report verification to user before committing.

---

## Project Structure

Each package has a `core/` directory (template infrastructure — don't edit) and domain code (freely customizable).

```
admin-dashboard-template/
├── docs/
│   ├── BRD.md             # Business Requirements Document
│   ├── ARCHITECTURE.md    # System architecture reference
│   ├── DEPLOYMENT.md      # Production deployment guide
│   ├── EXTENDING.md       # How to add features
│   ├── UPGRADING.md       # How to pull template updates
│   ├── CONFIGURATION.md   # Environment variables, CORS, rate limiting
│   ├── TROUBLESHOOTING.md # Common errors and fixes
│   └── LOCAL_DEVELOPMENT.md # Dev environment setup and testing
├── infrastructure/
│   ├── cloudflare/        # Cloudflare Tunnel config template
│   ├── systemd/           # systemd service files for backend + tunnel
│   └── scripts/           # setup-local.sh (PostgreSQL + env setup)
├── packages/
│   ├── shared/src/
│   │   ├── core/          # API types, permission types, utils (template infra)
│   │   ├── types/         # Domain types: user, group, audit, settings
│   │   └── constants/     # Permission definitions
│   ├── backend/src/
│   │   ├── core/          # Middleware, Firebase Auth, errors, response helpers (template infra)
│   │   ├── db/            # Drizzle ORM schema and database connection
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── config/        # App configuration
│   │   └── openapi/       # API documentation
│   └── frontend/src/
│       ├── core/          # Auth hooks, permission gates, API client (template infra)
│       ├── pages/         # Page components
│       ├── components/    # UI components
│       ├── hooks/         # Custom hooks
│       └── stores/        # State stores
├── scripts/
│   ├── dev.sh             # Start full dev environment
│   ├── init-project.sh    # Rename template for new project
│   └── sync-template.sh   # Pull upstream template updates
├── template.json          # Core vs. customizable path manifest
└── CLAUDE.md              # This file
```

## Commands

```bash
# Install dependencies
bun install

# Development
bun run dev              # Frontend + backend dev servers
bun run dev:full         # Everything (backend + frontend + Auth emulator + AI service)
bun run dev:frontend     # Frontend only (port 5173)
bun run dev:backend      # Backend only (port 3000)

# Database (run from packages/backend/)
bun run db:generate      # Generate Drizzle migration files
bun run db:migrate       # Run pending migrations
bun run db:push          # Push schema changes directly to database
bun run db:studio        # Open Drizzle Studio (database GUI)

# Verification (run before committing!)
bun run typecheck        # TypeScript
bun run lint             # Biome
bun run test             # Unit tests

# AI Service
bun run dev:ai-service   # AI service only
bun run build:ai-service # Build AI service

# Build & Deploy
bun run build            # Production build (backend + frontend)
bun run build:frontend   # Frontend only
bun run build:backend    # Backend only
bun run deploy:frontend  # Deploy frontend to Cloudflare Pages
bun run tunnel:start     # Start Cloudflare Tunnel
bun run setup:local      # Set up PostgreSQL and generate .env
```

## Tech Stack
- **Runtime**: Bun (not Node.js)
- **Frontend**: React 18, TanStack Query, Zustand, shadcn/ui, Tailwind CSS
- **Backend**: Hono (standalone Bun server)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Firebase Auth (Google OAuth, free tier only)
- **Frontend Hosting**: Cloudflare Pages (free tier)
- **Backend Exposure**: Cloudflare Tunnel (free tier)
- **Linting**: Biome (not ESLint/Prettier)

---

## Architecture Patterns

### Backend

#### Config-Driven Settings
All environment-specific settings are in `src/config/index.ts`:
```typescript
import { config } from './config';
// config.cors.origins - allowed CORS origins
// config.rateLimit.max - requests per window
```

#### Custom Error Classes
```typescript
import { NotFoundError, ForbiddenError } from '../core/errors';
throw new NotFoundError('User');  // 404
throw new ForbiddenError('Cannot modify super admin');  // 403
```

#### Singleton Services
Services are instantiated once in `src/services/index.ts`.

#### Drizzle ORM Patterns
```typescript
// Query
const users = await db.select().from(usersTable).where(eq(usersTable.email, email));

// Insert
const [user] = await db.insert(usersTable).values({ ... }).returning();

// Update
await db.update(usersTable).set({ updatedAt: new Date() }).where(eq(usersTable.id, id));

// Transaction
await db.transaction(async (tx) => {
  await tx.insert(usersTable).values({ ... });
  await tx.insert(auditLogsTable).values({ ... });
});
```

### Frontend

#### Reuse Shared Components Before Writing New UI
Before adding any new UI to a page, check `packages/frontend/src/components/features/` for existing shared components. These cover common patterns across pages:

| Component | Purpose |
|---|---|
| `PageHeader` | Simple page title + description |
| `ListHeader` | Title + description + permission-gated create button |
| `SearchFilterBar` | Search input with icon + optional filter children |
| `BulkActionBar` | "N selected" bar with permission-gated delete button |
| `DeleteConfirmationDialog` | Destructive action confirmation dialog |
| `MetadataCard` | Card with icon + label + value rows (IDs, dates, etc.) |
| `PermissionsCard` | Displays user/group permissions with super admin badge |
| `NotificationsCard` | Email/push notification toggle switches (react-hook-form) |
| `AppearanceCard` | Theme selector (light/dark/system) |
| `ErrorStatePage` | Full-page error layout (404, 403) with back/home buttons |

**Rule**: Always scan `components/features/` before implementing page-level UI. If a pattern exists, import and use the shared component. If a new pattern appears in 2+ pages, extract it into a shared component.

#### Key Features
- Error Boundary wraps the app
- API client: 30s timeout, retry with exponential backoff, token refresh on 401
- Accessibility: focus trap, escape key, ARIA attributes
- Performance: memoized rows, debounce cleanup, TanStack Query caching

### AI Service

- **Package location**: `packages/ai-service/`
- **Dev command**: `bun run dev:full` starts all services (frontend + backend + AI service)
- **WebSocket endpoint**: `/ws/chat` — the frontend connects here for AI interactions
- **Tool definitions**: Auto-generated from the backend's OpenAPI spec on build. Adding a new documented API endpoint automatically makes it available as an AI tool
- **Config**: Environment variables in `packages/ai-service/.env` (see `.env.example`). Key vars: `GEMINI_API_KEY`, `AI_SYSTEM_PROMPT`
- **Gemini models**: `gemini-2.0-flash` (chat mode), `gemini-2.0-flash-live-001` (voice mode)
- **Permission**: Requires `ai:use` permission. The AI service forwards the user's auth token and respects their permissions when executing tools

## Environment
- `cp` and `rm` have `-i` aliases on this system — use `/bin/cp` and `yes | /bin/rm` to bypass
- Pre-existing typecheck errors in `routes/groups.ts` and `core/hooks/useAuth.ts` — not introduced by restructuring
