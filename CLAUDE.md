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
- **Groups are stored in Firestore** with assigned permission strings
- **Super Admin** is determined by `SUPER_ADMIN_EMAIL` env var (not first login) and bypasses all permission checks
- Backend enforces permissions via middleware (`requirePermission`); frontend conditionally renders via `user.permissions` array

### Auth
- Google OAuth only (no email/password) — even in dev mode with emulators
- Firebase Auth emulator shows a Google sign-in popup for test users

### Admin Screens
- **User Management** (`/users`): list users, multi-group assignments (add/remove groups), disable/enable/delete
- **Group Management** (`/groups`): create/edit/delete groups, assign permissions, set default group

### Multi-Group Model
- Users have `groupIds: string[]` (not a single `groupId`) -- they can belong to multiple groups
- Permissions are **merged** from all assigned groups (union of all group permissions)
- Add/remove group endpoints: `POST /users/:id/groups/add`, `POST /users/:id/groups/remove`
- Data migration from `groupId` to `groupIds` runs automatically via `initializeDefaultGroups` on login

---

## Definition of Done

**No code change is complete until ALL related tests pass, including infrastructure tests.** When making any change:

1. **Run the relevant test suite** for every layer affected by the change (unit, integration, e2e, infrastructure).
2. **Infrastructure changes require `terraform apply`** against a real project with ALL features enabled. `terraform validate` and `terraform plan` are not sufficient — GCP API errors (wrong resource types, timing issues, service availability) only surface during `apply`.
3. **If e2e tests disable features** (like monitoring or Google Sign-In), those disabled features are NOT tested. You must either enable them in tests or manually verify with `terraform apply`.
4. **Do not claim work is done if any test is skipped or disabled for the changed code path.**

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

## Infrastructure Notes

- **Log-based metric alert policies** require a `time_sleep` (60s) between metric creation and alert policy creation. GCP takes time to register new log-based metrics.
- **Alert policy resource types**: `global` for auth/firestore metrics, `cloud_function` for function/latency metrics.
- **Firestore audit logging** uses `datastore.googleapis.com` as the service name, NOT `firestore.googleapis.com`.
- **Google Sign-In** cannot be fully automated for personal (non-org) GCP projects — OAuth client creation requires the Cloud Console UI. See `terraform.tfvars.example` for setup instructions.

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
│   ├── EXTENDING.md       # How to add features
│   └── UPGRADING.md       # How to pull template updates
├── infrastructure/
│   ├── terraform/         # IaC for GCP/Firebase
│   └── scripts/           # Setup and deploy helpers
├── packages/
│   ├── shared/src/
│   │   ├── core/          # API types, permission types, utils (template infra)
│   │   ├── types/         # Domain types: user, group, audit, settings
│   │   └── constants/     # Permission definitions
│   ├── backend/src/
│   │   ├── core/          # Middleware, Firebase, errors, response helpers (template infra)
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   └── config/        # App configuration
│   └── frontend/src/
│       ├── core/          # Auth hooks, permission gates, API client (template infra)
│       ├── pages/         # Page components
│       ├── components/    # UI components
│       └── stores/        # State stores
├── scripts/
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
bun run dev              # All services
bun run dev:frontend     # Frontend only (port 5173)
bun run dev:backend      # Backend only

# Verification (run before committing!)
bun run typecheck        # TypeScript
bun run lint             # Biome
bun run test             # Unit tests

# Build & Deploy
bun run build            # Production build
npx playwright test      # Frontend e2e tests
./e2e/deploy/test-terraform-deploy.sh  # Full deploy e2e
```

## Tech Stack
- **Runtime**: Bun (not Node.js, not Vite)
- **Frontend**: React 18, TanStack Query, Zustand, shadcn/ui, Tailwind CSS
- **Backend**: Hono on Firebase Cloud Functions
- **Database**: Firestore
- **Auth**: Firebase Auth (Google OAuth)
- **Linting**: Biome (not ESLint/Prettier)
- **IaC**: Terraform for GCP/Firebase

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

#### Cursor-Based Pagination
Use cursor instead of offset for efficient Firestore queries.

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

## Environment
- `cp` and `rm` have `-i` aliases on this system — use `/bin/cp` and `yes | /bin/rm` to bypass
- Pre-existing typecheck errors in `routes/groups.ts` and `core/hooks/useAuth.ts` — not introduced by restructuring
