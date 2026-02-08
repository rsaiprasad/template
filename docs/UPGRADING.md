# Upgrading from Template

This guide explains how to pull updates from the upstream Admin Dashboard Template into your downstream project.

## How It Works

The template separates code into **core** (template-owned) and **customizable** (project-owned) directories. When the template is updated, changes in `core/` paths can be merged into your project with minimal conflicts because:

- `core/` directories contain template infrastructure (auth, permissions, API client)
- Your domain code (routes, services, pages) lives outside `core/`
- Re-export shims at old import paths prevent breaking changes

## Prerequisites

- Your project was created from the template (via GitHub "Use this template" or `git clone`)
- You have no uncommitted changes
- You know the template repo URL

## Sync Process

### 1. Run the Sync Script

```bash
./scripts/sync-template.sh https://github.com/your-org/admin-dashboard-template.git
```

This will:
- Add the template repo as a git remote (`template-upstream`)
- Fetch the latest changes
- Show a diff of changes in `core/` paths only
- Suggest merge commands

### 2. Create a Merge Branch

```bash
git checkout -b template-sync-$(date +%Y%m%d)
git merge template-upstream/main --no-commit
```

### 3. Review Changes

Check the diff carefully. Changes should be limited to `core/` paths:

```bash
git diff --cached -- packages/*/src/core/
```

### 4. Resolve Conflicts (if any)

If you edited `core/` files (not recommended), you may have conflicts. Resolve them by keeping the template's version for core infrastructure and your version for any customizations.

### 5. Test and Commit

```bash
bun run build
bun run typecheck
git commit -m "chore: sync template core to vX.Y.Z"
```

## Manual Upgrade (Without Script)

If you prefer manual control:

```bash
# Add template remote
git remote add template-upstream <template-repo-url>

# Fetch template changes
git fetch template-upstream main

# See what changed in core/
git diff HEAD...template-upstream/main -- packages/*/src/core/

# Merge (review before committing)
git merge template-upstream/main --no-commit

# Build and test
bun run build

# Commit
git commit -m "chore: sync template core"
```

## Checking Template Version

See `template.json` at the project root for the current template version and the list of core vs. customizable paths.

## Troubleshooting

### "Merge conflicts in core/ files"

You likely edited a core file directly. Compare your version with the template's version:

```bash
git diff template-upstream/main -- <conflicted-file>
```

In most cases, accept the template's version for core files.

### "Build fails after merge"

1. Check if the template added new dependencies: `bun install`
2. Check if types changed: `bun run typecheck` and fix downstream usage
3. Check the TEMPLATE_CHANGELOG.md for migration notes

### "Import errors after merge"

The re-export shims at old paths should prevent this. If you see import errors, check that the shim files still exist (e.g., `src/lib/firebase.ts` should re-export from `src/core/lib/firebase.ts`).
