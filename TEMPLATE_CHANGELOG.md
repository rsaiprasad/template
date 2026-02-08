# Template Changelog

All notable changes to the template core are documented here. Downstream projects should review this when syncing template updates.

## [1.0.0] - 2026-02-08

### Added
- **Core/customizable separation**: Infrastructure code moved to `core/` directories in all three packages (shared, backend, frontend). Domain code remains in its original location.
- **Template init script**: `scripts/init-project.sh` renames the project and npm scope across all files.
- **Template sync script**: `scripts/sync-template.sh` fetches upstream template changes and shows a diff of `core/` paths.
- **Template manifest**: `template.json` declares template version and lists core vs. customizable paths.
- **Documentation**: `docs/EXTENDING.md` (how to add features) and `docs/UPGRADING.md` (how to pull template updates).

### Core paths established

| Package | Core path | Contains |
|---------|-----------|----------|
| shared | `src/core/types/` | API response types, permission type system |
| shared | `src/core/utils/` | Permission utilities, validation helpers |
| backend | `src/core/middleware/` | Auth, permissions, audit, rate-limit middleware |
| backend | `src/core/lib/` | Firebase Admin SDK initialization |
| backend | `src/core/utils/` | Response helpers, error codes |
| backend | `src/core/errors/` | Custom error classes |
| backend | `src/core/types/` | Hono context types |
| frontend | `src/core/api/` | AdminDashboardApi client class |
| frontend | `src/core/components/` | PermissionGate, RequireAuth, RequirePermission |
| frontend | `src/core/hooks/` | useAuth, usePermissions |
| frontend | `src/core/stores/` | Auth store (Zustand) |
| frontend | `src/core/lib/` | Firebase client SDK, utility functions |

### Migration notes
- No migration needed for existing projects. All imports continue to work via re-export shims at the original paths.
- New projects should import from `core/` paths directly where possible.
