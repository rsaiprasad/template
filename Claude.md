# Claude.md - Project Guidelines & Lessons Learned

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

---

## Project Structure

```
admin-dashboard-template/
├── packages/
│   ├── frontend/     # React + Bun bundler
│   ├── backend/      # Hono REST API
│   └── shared/       # Shared types & utilities
├── firebase/         # Firebase configuration
├── biome.json        # Linting/formatting
└── Claude.md         # This file
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
