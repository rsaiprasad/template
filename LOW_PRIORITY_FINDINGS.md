# Low Priority Findings

Issues identified during full project code review. To be tackled later.

---

## 1. Email Case Sensitivity Could Cause Auth Mismatches
- **File**: `packages/backend/src/services/user.service.ts:48-52`
- **Description**: Firebase Auth is case-insensitive but preserves original case. Firestore queries use lowercase. Mismatch possible if Firebase Auth stores `User@Example.com` but Firestore queries for `user@example.com`.
- **Fix**: Always normalize email to lowercase when interfacing with Firebase Auth.

## 2. In-Memory Rate Limit Store Doesn't Persist Across Cold Starts
- **File**: `packages/backend/src/core/middleware/rate-limit.ts`
- **Description**: Cloud Functions cold starts reset the in-memory Map. Rate limiting is effectively per-instance, not global.
- **Fix**: Use Redis/Memorystore for distributed rate limiting in production.

## 3. Missing Terraform Backend Configuration
- **File**: `infrastructure/terraform/` (missing backend.tf)
- **Description**: Defaults to local state. Dangerous for production or team collaboration.
- **Fix**: Add `backend.tf.example` with commented-out GCS backend config.

## 4. `bun run dev:full` Not Documented in README Commands Table
- **File**: `README.md`
- **Description**: The `dev:full` command (starts emulators + dev servers together) is not listed.
- **Fix**: Add `| bun run dev:full | Start Firebase emulators + dev servers |` to commands table.

## 5. `bun run test` May Produce No Output
- **File**: `README.md`
- **Description**: Test infrastructure exists but test file coverage is unclear.
- **Fix**: Verify tests exist and document coverage expectations.

## 6. Inconsistent Null Handling in enableUser()
- **File**: `packages/backend/src/services/user.service.ts:414-427`
- **Description**: Returns `undefined` for `disabledAt`/`disabledBy` but stores `null` in Firestore.
- **Fix**: Use `null` consistently or use `FieldValue.delete()`.

## 7. Missing AbortController Cleanup in API Client
- **File**: `packages/frontend/src/core/api/client.ts:174-177`
- **Description**: AbortController timeout not cleaned up if component unmounts during request.
- **Fix**: Wrap fetch in try-finally for `clearTimeout(timeoutId)`.

## 8. Default Group Fallback Uses Hardcoded 'users'
- **File**: `packages/backend/src/services/user.service.ts:183, 258`
- **Description**: Falls back to `'users'` group if settings don't exist. Fails if that group doesn't exist.
- **Fix**: Validate default group exists before using it, or create on-the-fly.

## 9. Stale Closure in useDebouncedSearch
- **File**: `packages/frontend/src/hooks/useDebouncedSearch.ts:50-67`
- **Description**: Callback recreated when `searchParams` changes but old timeout not cleared.
- **Fix**: Clear previous timeout when callback dependencies change.

## 10. CORS Origin Validation Doesn't Check for Wildcard in Production
- **File**: `packages/backend/src/config/index.ts`
- **Description**: No check for `*` wildcard origin that could be accidentally set in production.
- **Fix**: Warn/error if `*` is used outside development mode.

## 11. Firebase API Key Incorrectly Marked Sensitive in Terraform
- **File**: `infrastructure/terraform/outputs.tf:20`
- **Description**: Firebase API keys are public by design but marked `sensitive = true`.
- **Fix**: Remove `sensitive = true` from firebase_api_key output.

## 12. Missing Composite Index Hints for Firestore Queries
- **File**: `packages/backend/src/services/user.service.ts:106-128`
- **Description**: Combined filters without ensuring required composite indexes exist.
- **Fix**: Include `firestore.indexes.json` with all required composite indexes.

## 13. Firestore Timestamp Conversion Uses Duck Typing
- **File**: `packages/backend/src/core/lib/firebase-admin.ts:94-109`
- **Description**: Checks for `toDate` method instead of `instanceof Timestamp`.
- **Fix**: Use `instanceof Timestamp` for more precise checking.

## 14. Health Check Endpoint Subject to Rate Limiting
- **File**: `packages/backend/src/app.ts:73-82`
- **Description**: Monitoring systems making frequent health checks could be rate-limited.
- **Fix**: Exempt health check from rate limiting.

## 15. sync-template.sh Truncates Large Diffs at 100 Lines
- **File**: `scripts/sync-template.sh:84-88`
- **Description**: Important changes could be hidden in truncated output.
- **Fix**: Save full diff to file and show truncated in terminal.

## 16. E2E Tests Don't Verify Firestore Rules Deployment
- **File**: `e2e/deploy/helpers.sh:244-270`
- **Description**: Deployment verification doesn't check that security rules were deployed.
- **Fix**: Add Firestore rules verification step.

## 17. No Alert Rate Limiting in Monitoring Config
- **File**: `infrastructure/terraform/monitoring.tf`
- **Description**: No notification cooldown could cause alert fatigue.
- **Fix**: Add `notification_rate_limit { period = "300s" }` to alert strategy.

## 18. Predeploy Hook Has No Error Handling for Package.json Restore
- **File**: `scripts/restore-dev-deps.sh:4-7`
- **Description**: If deploy fails between strip and restore, `.bak` file might not exist.
- **Fix**: Add warning if backup doesn't exist.

## 19. Race Condition in dev.sh Health Check
- **File**: `scripts/dev.sh:124-136`
- **Description**: If emulator crashes after starting, script waits full 60s before detecting failure.
- **Fix**: Check emulator process health more frequently in the loop.

## 20. Missing Null Check in getInitials Utility
- **File**: Multiple files
- **Description**: If both `displayName` and `email` are null, avatar fallback may crash.
- **Fix**: Add explicit null handling with fallback to "U".

## 21. Missing Input Length Validation on Search Fields
- **File**: `packages/frontend/src/pages/users/UserList.tsx:228-233`
- **Description**: Search input has no maxLength, could cause performance issues with very long strings.
- **Fix**: Add `maxLength={100}` to search inputs.

## 22. Theme Store Initialization Could Block Render
- **File**: `packages/frontend/src/main.tsx:9`
- **Description**: Synchronous `initializeTheme()` before React render could block on slow localStorage.
- **Fix**: Defer to after initial render or make async.

## 23. Audit Log Resource Type Mismatch with Permission Resources
- **File**: `packages/shared/src/types/audit.ts:21`
- **Description**: `AuditResource` includes 'auth' but `PermissionResource` does not.
- **Fix**: Align types or document the intentional difference.

## 24. CORS Returns First Origin When Origin Header Missing
- **File**: `packages/backend/src/app.ts:47-51`
- **Description**: Server-to-server requests get first configured origin returned.
- **Fix**: Return null or reject for missing origin headers.

## 25. Super Admin Can Change Their Own Group
- **File**: `packages/backend/src/services/user.service.ts:458-460`
- **Description**: No check prevents super admins from moving themselves to non-admin group.
- **Fix**: Add self-modification check for super admin group changes.
