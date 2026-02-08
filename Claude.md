# Claude.md - Project Guidelines & Lessons Learned

## Session Start Checklist

**At the start of every session, read the BRD for full application context:**
- **BRD**: `docs/BRD.md` — the authoritative requirements document
- **Shared permissions**: `packages/shared/src/constants/permissions.ts` — single source of truth for all permissions
- **Shared types**: `packages/shared/src/types/` — type definitions used across backend and frontend

## Application Context

This is an **Admin Dashboard Template** — a reusable foundation for B2C/B2B SaaS apps. Key architecture decisions:

### Permission System
- **Permissions are defined in code** (`packages/shared/src/constants/permissions.ts`), not in a database
- **Groups are stored in Firestore** with assigned permission strings from the shared file
- **Super Admin** is determined by `SUPER_ADMIN_EMAIL` env var (not first login) and bypasses all permission checks
- When developers build on this template, they add new `resource:action` entries to the shared permissions file — these auto-appear in the Group Management UI
- Backend enforces permissions via middleware (`requirePermission`); frontend conditionally renders via `user.permissions` array

### Auth
- Google OAuth only (no email/password) — even in dev mode with emulators
- Firebase Auth emulator shows a Google sign-in popup for test users

### Admin Screens
- **User Management** (`/users`): list users, group assignments, disable/enable/delete
- **Group Management** (`/groups`): create/edit/delete groups, assign permissions, set default group

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `Claude.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. End-to-End Verification After Structural Changes
After completing any non-trivial implementation (especially restructuring, refactoring, or multi-file changes), kick off **two parallel subagents** before marking the work as done:

1. **E2E test subagent** — Start `bun run dev:full`, wait for emulators + servers, then use Playwright (browser MCP tools) to verify the app works end-to-end: sign in, navigate admin menus (Users, Groups, Audit Logs), verify pages load without errors, check browser console for runtime errors.

2. **Documentation update subagent** — Review all documentation files (`Claude.md`, `README.md`, `docs/*.md`, `TEMPLATE_CHANGELOG.md`) to ensure they accurately reflect the current state of the codebase. Fix any stale references, outdated paths, or missing information.

Both subagents run in parallel. Don't mark the task complete until both pass.

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to todo list with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section after completion
6. **Capture Lessons**: Update `Claude.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Project-Specific Lessons

### Lesson 1: Always Build and Test Before Claiming Done
**Date**: 2026-02-02
**Mistake**: Committed and pushed code claiming the Admin Dashboard Template was complete without:
- Running `bun install` to verify dependencies install correctly
- Running `bun run typecheck` to verify TypeScript compiles
- Running the dev server to verify the app starts
- Testing in a browser to verify the UI renders

**Impact**: Multiple TypeScript errors existed that would have prevented the app from building.

**Rule**: Before marking ANY implementation task as complete:
1. Install dependencies: `bun install`
2. Run type checking: `bun run typecheck`
3. Run linting: `bun run lint`
4. Start the dev server and verify it runs without errors
5. Open in browser and verify basic functionality works

### Lesson 2: Type Definitions Must Match Across Packages
**Date**: 2026-02-02
**Mistake**: Frontend code expected different property names than the shared types defined:
- `log.createdAt` vs `log.timestamp`
- `log.resourceType` vs `log.resource`
- `log.userId` vs `log.actorId`
- Permission expected as object with `id`, `name`, `description` but was a string type

**Rule**: When creating shared types:
1. Define types in shared package FIRST
2. Use those exact types in both frontend and backend
3. Don't assume property names - read the shared type definitions
4. Run typecheck across all packages before committing

### Lesson 3: ApiResponse Type Narrowing Required
**Date**: 2026-02-02
**Mistake**: Tried to access `.data` on `ApiResponse<T>` without checking `success` first. TypeScript union types require narrowing.

**Rule**: Always narrow ApiResponse before accessing data:
```typescript
const response = await api.getUser(id);
if (!response.success) {
  throw new Error(response.error.message);
}
// Now TypeScript knows response.data exists
const user = response.data;
```

### Lesson 4: Git Commits Must Be Checked for Sensitive Data
**Date**: 2026-02-03
**Mistake**: Nearly committed files containing API keys, project IDs, and email addresses without verification.

**Rule**: Before EVERY git commit:
1. Run `git diff --cached` to review all staged changes
2. Search for sensitive patterns:
   ```bash
   git diff --cached | grep -iE "(AIza|api.key|apikey|secret|password|token|@gmail|@company)" || echo "Clean"
   ```
3. Check for project-specific sensitive data (project IDs, email addresses)
4. **Report to user**: "I've verified the staged changes contain no sensitive data (API keys, credentials, personal emails, or project IDs)" before requesting commit approval
5. If any sensitive data is found, fix it BEFORE committing

**What counts as sensitive**:
- API keys (especially `AIza...` Firebase keys)
- Service account credentials
- Email addresses (except example placeholders like `admin@example.com`)
- Project IDs that aren't placeholders
- Passwords, tokens, secrets
- Private URLs or internal hostnames

---

## Project Requirements

**See [Business Requirements Document](./docs/BRD.md)** for complete project requirements including:
- Functional requirements (authentication, user management, groups, permissions, audit)
- Non-functional requirements (performance, security, scalability)
- Data models and API specifications
- Implementation status checklist

## Project Structure

Each package has a `core/` directory (template infrastructure — don't edit) and domain code (freely customizable).

```
admin-dashboard-template/
├── docs/
│   ├── BRD.md             # Business Requirements Document
│   ├── EXTENDING.md       # How to add features
│   └── UPGRADING.md       # How to pull template updates
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
└── Claude.md              # This file
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

# Build
bun run build            # Production build
```

## Tech Stack
- **Runtime**: Bun (not Node.js, not Vite)
- **Frontend**: React 18, TanStack Query, Zustand, shadcn/ui, Tailwind CSS
- **Backend**: Hono on Firebase Cloud Functions
- **Database**: Firestore
- **Auth**: Firebase Auth (Google OAuth)
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

Set via environment variables:
- `CORS_ORIGINS` - comma-separated list of allowed origins
- Firebase project ID is read from `firebase/.firebaserc` (single source of truth)

#### Custom Error Classes
Use typed errors instead of string messages:
```typescript
import { NotFoundError, ForbiddenError } from '../core/errors';

// In services:
throw new NotFoundError('User');  // 404
throw new ForbiddenError('Cannot modify super admin');  // 403

// Global error handler catches AppError instances automatically
```

#### Singleton Services
Services are instantiated once in `src/services/index.ts`:
```typescript
import { userService, groupService } from './services';
// Don't instantiate new services in routes
```

#### Cursor-Based Pagination
Use cursor instead of offset for efficient Firestore queries:
```typescript
const { data, meta } = await userService.listUsers({
  cursor: 'lastDocId',  // Instead of page/offset
  limit: 20
});
// meta.nextCursor for next page
```

### Frontend

#### Error Boundary
App is wrapped in ErrorBoundary - catches JS errors and shows recovery UI.

#### API Client Features
- 30s request timeout with AbortController
- Automatic retry with exponential backoff (network errors, 5xx)
- Token refresh on 401 responses
- Type-safe responses with proper error handling

#### Accessibility
- Focus trap in mobile menu
- Escape key closes dialogs
- ARIA attributes on interactive elements
- Navigation progress indicator

#### Performance
- Memoized list row components (React.memo)
- Debounce cleanup on unmount
- TanStack Query caching (5min stale time)
