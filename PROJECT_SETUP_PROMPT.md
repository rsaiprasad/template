# Reusable Project Setup Prompt

Copy and paste the prompt below into Claude Code when starting a new project from the admin dashboard template. Replace all `{{PLACEHOLDERS}}` with your project-specific values.

---

## Prompt

```
I'm building a new application called "{{PROJECT_NAME}}" using the admin dashboard template at https://github.com/rsaiprasad/template (localbackend_cloudflare branch).

My project directory is: {{PROJECT_DIR}}
The requirements documents are already in: {{PROJECT_DIR}}/requirements/

## Phase 0: Bootstrap & Setup

Please do the following setup steps in order:

### 1. Clone & Initialize Template
- Clone the template (localbackend_cloudflare branch) into the project directory
- Preserve any existing files (especially requirements/)
- Run the init script: `./scripts/init-project.sh {{project-slug}} @{{npm-scope}}`
  - This renames all "admin-dashboard-template" → "{{project-slug}}" and "@admin-dashboard" → "@{{npm-scope}}"
- Run `bun install`
- **Record the template commit** in `template.json` for future updates (see step 1b)

### 1b. Record Template Commit in template.json
After cloning, get the template's HEAD commit hash and add a `template` block to `template.json`:
```json
{
  "template": {
    "repo": "https://github.com/rsaiprasad/template.git",
    "branch": "localbackend_cloudflare",
    "commit": "<HEAD commit hash from the cloned template>",
    "clonedAt": "<today's date YYYY-MM-DD>"
  }
}
```
This allows future template updates by diffing from this commit.
To get the commit hash, run: `git ls-remote https://github.com/rsaiprasad/template.git localbackend_cloudflare | cut -f1`

### 2. Configure .claude/settings.json
Create `.claude/settings.json` in the project root with agent team mode and tmux:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "preferences": {
    "teamMode": true,
    "agentDisplay": "tmuxSplitPanes"
  }
}
```

### 3. Extend CLAUDE.md
The template provides a CLAUDE.md. APPEND (don't replace) these sections:

- **Application Context**: Update from "Admin Dashboard Template" to "{{PROJECT_NAME}} — {{one-line description}}, built on the Admin Dashboard Template"
- **Key Requirements Documents**: Point to the requirements/ files
- **Custom Permissions**: List all domain-specific permissions from the BRD
- **Domain-Specific File Organization**: Map where code goes:
  - `packages/shared/src/types/` — domain types
  - `packages/shared/src/schemas/` — Zod validation schemas
  - `packages/shared/src/constants/` — domain constants, permissions
  - `packages/backend/src/services/` — domain service classes
  - `packages/backend/src/routes/` — domain API routes
  - `packages/backend/src/openapi/routes/` — OpenAPI route definitions
  - `packages/frontend/src/pages/` — domain pages
  - `packages/frontend/src/components/` — domain components
  - `packages/frontend/src/stores/` — domain Zustand stores
- **Team Execution Mode**: Add these guidelines:
  ```
  This project uses auto-spawning agent teams:
  1. Use TeamCreate to create a team for the current phase
  2. Use TaskCreate to define tasks from the plan
  3. Spawn parallel agents via Task tool with team_name
  4. Agents coordinate via shared task list and SendMessage
  5. Maximum 5 agents running in parallel at any time
  ```
- **Max Parallel Agents**: Set to 5 (hard limit for this machine)

### 4. Create Implementation Plan
Read ALL requirements documents in requirements/ and create a multi-phase implementation plan at `.claude/plans/implementation-plan.md`.

Structure the plan as:
- **Phase 0**: Bootstrap (what we're doing now) — sequential, single agent
- **Phase 1**: Foundation — schema, types, DB tables, core services, API routes, frontend shell
  - Team 1: Schema Foundation (CRITICAL PATH — shared types, Zod schemas, constants, permissions, DB tables)
  - Team 2+: Parallel teams for services, routes, frontend (depend on Team 1)
- **Phase 2**: Enhanced features — build on Phase 1 foundation
- **Phase 3**: Maturity — advanced features, polish, analytics

For each phase:
- Identify independent work streams that can run in parallel (max 5 at a time)
- Map dependencies between teams (which teams block which)
- List exact files each team creates
- Define verification criteria (typecheck, lint, tests)

Key conventions from the template:
- `core/` directories are READ-ONLY (template infrastructure)
- All domain code goes OUTSIDE `core/`
- Services are singletons via `services/index.ts`
- Permission middleware: `requirePermission('resource:action')`
- Response helpers: `successResponse()`, `errorResponse()`, `paginatedResponse()`
- Frontend uses PageHeader, SearchFilterBar shared components
- Zustand for client state, TanStack Query for server state
- Biome for linting/formatting

### 5. Local Infrastructure Setup
- Run `./infrastructure/scripts/setup-local.sh` to set up PostgreSQL
- Verify `bun run typecheck` passes
- Verify `bun run dev:full` starts all services
- Add any domain-specific env vars to `packages/backend/.env`

### 6. Create Frontend .env
Create `packages/frontend/.env` with placeholder Firebase credentials:
```
PUBLIC_API_BASE_URL=/api/v1
PUBLIC_FIREBASE_API_KEY=AIzaSyDEV-placeholder-key-for-emulator
PUBLIC_FIREBASE_AUTH_DOMAIN={{project-slug}}-dev.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID={{project-slug}}-dev
PUBLIC_FIREBASE_STORAGE_BUCKET={{project-slug}}-dev.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
PUBLIC_FIREBASE_APP_ID=1:000000000000:web:devplaceholder
```

### 7. Commit & Verify
- Commit: "Initialize {{PROJECT_NAME}} from template with project setup"
- Push to origin/main
- Verify clean build: `bun run typecheck && bun run lint`

## Phase 1+: Execute the Plan

After Phase 0 is complete, execute each subsequent phase using agent teams:

1. **Enter plan mode** and read the implementation plan
2. **Create a team** with `TeamCreate` for the phase
3. **Create tasks** with `TaskCreate` for each work stream
4. **Spawn agents** with `Task` tool (max 5 parallel, use `run_in_background: true`)
   - Each agent gets: team_name, name, mode: "bypassPermissions"
   - Each agent's prompt includes: exact files to create, what to read for context, verification steps
5. **Wait for all agents** to complete
6. **Run full typecheck** across all packages
7. **Fix any errors** found
8. **Commit and push** with a descriptive message
9. **Shut down the team** and clean up
10. **Move to next phase**

## Key Patterns to Follow

- **Schema first**: Always create shared types and DB tables before services/routes
- **Barrel exports**: Update `index.ts` barrel files when adding new services/modules
- **Singleton services**: Instantiate in `services/index.ts`, import the singleton everywhere
- **Permission per route**: Every route handler uses `requirePermission('domain:action')`
- **ApiResponse narrowing**: Always check `response.success` before accessing `response.data`
- **No core/ edits**: Never modify files inside `core/` directories

## Pulling Template Updates

When the template repo has new commits, update your project:

1. Check current template commit: `cat template.json | grep commit`
2. Check latest template commit: `git ls-remote https://github.com/rsaiprasad/template.git localbackend_cloudflare | cut -f1`
3. If they differ, run: `./scripts/sync-template.sh`
   - This fetches changes from the template repo
   - Diffs only the `core/` paths (your domain code is untouched)
   - Suggests merge commands
4. After merging, update the `commit` field in `template.json` to the new hash
5. Run `bun run typecheck` to verify nothing broke
6. Commit: "Update template core to <short-hash>"

See `docs/UPGRADING.md` for the full process.
```

---

## Placeholder Reference

| Placeholder | Example (StockStudy) | Description |
|---|---|---|
| `{{PROJECT_NAME}}` | StockStudy | Human-readable project name |
| `{{PROJECT_DIR}}` | /home/user/workspace/stockstudy | Absolute path to project |
| `{{project-slug}}` | stock-study | kebab-case for package.json name |
| `{{npm-scope}}` | stockstudy | npm scope without @ |
| `{{one-line description}}` | AI-powered stock analysis and prediction platform | Short description |
