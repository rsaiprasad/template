# Template Changelog

All notable changes to the template core are documented here. Downstream projects should review this when syncing template updates.

## [1.2.0] - 2026-02-09

### Added
- **Multi-group support**: Users can now belong to multiple groups simultaneously. Permissions are merged (union) from all assigned groups.
- **Add/remove group endpoints**: `POST /api/v1/users/:id/groups/add` and `POST /api/v1/users/:id/groups/remove` replace the old `PUT /api/v1/users/:id/group` endpoint.
- **Automatic data migration**: `initializeDefaultGroups` migrates existing users from `groupId: string` to `groupIds: string[]` on login, ensuring backward compatibility.

### Changed
- **User model**: `User.groupId: string` changed to `User.groupIds: string[]` in `packages/shared/src/types/user.ts`.
- **Permission resolution**: Backend middleware now merges permissions from all groups in a user's `groupIds` array instead of reading from a single group.
- **Firestore security rules**: Updated `isAdmin()` helper to check `groupIds` array membership instead of a single `groupId` field.
- **Firestore indexes**: Updated to support queries on the `groupIds` array field.
- **Users page**: Now displays multiple group badges per user and supports add/remove group actions.
- **Audit actions**: `USER_GROUP_CHANGED` replaced by `USER_GROUP_ADDED` and `USER_GROUP_REMOVED` for granular tracking.

### Migration notes
- The `groupId` field on user documents is no longer used. Existing users are automatically migrated to `groupIds` on their next login via `initializeDefaultGroups`.
- If your code references `user.groupId`, update it to `user.groupIds` (an array).
- The `PUT /api/v1/users/:id/group` endpoint is removed. Use the new `POST .../groups/add` and `POST .../groups/remove` endpoints instead.

## [1.1.0] - 2026-02-09

### Changed
- **Permission restructuring**: Core template permissions (users, groups, settings, audit) moved from `packages/shared/src/constants/permissions.ts` to `packages/backend/src/core/permissions.ts`. The shared file now only exports `CUSTOM_PERMISSIONS` for developers to add app-specific permissions.
- **Permission types renamed**: `PermissionAction` -> `CorePermissionAction`, `PermissionResource` -> `CorePermissionResource`. New `CorePermission` type (strict union) and `Permission` type (extensible with `string & {}`).
- **Backend permission helpers**: New file `packages/backend/src/core/permissions.ts` exports `CORE_PERMISSIONS`, `getAllPermissions()`, `getAdminPermissions()`, `getUserPermissions()`, `getPermissionDefinitions()`, `getPermissionsByResource()`, `getPermissionDescription()`.
- **GroupList**: Fixed "0 members" display bug (now uses `userCount` from API), added "System" badge for system groups, hid delete action for system groups.

### Removed
- Old exports from shared permissions: `PERMISSIONS`, `ALL_PERMISSIONS`, `ADMIN_PERMISSIONS`, `USER_PERMISSIONS`, `USERS_PERMISSIONS`, `GROUPS_PERMISSIONS`, `SETTINGS_PERMISSIONS`, `AUDIT_PERMISSIONS`, `PERMISSION_RESOURCES`, `PERMISSIONS_BY_RESOURCE`, `getPermissionsByResource`, `getPermissionDescription`.

### Migration notes
- If your code imported `PERMISSIONS` or other removed exports from `@admin-dashboard/shared`, update imports to use `CUSTOM_PERMISSIONS` from the shared package or the helper functions from `packages/backend/src/core/permissions.ts`.
- The `Permission` type is now extensible -- no need to edit `permission.ts` when adding custom permissions.

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
| backend | `src/core/permissions.ts` | Core permission definitions and helpers |
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
