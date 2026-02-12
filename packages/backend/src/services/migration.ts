/**
 * Normalize a user record's group fields to the `groupIds` array format.
 * With PostgreSQL + junction table this is a no-op passthrough,
 * but kept for backward compatibility with callers.
 */
export function normalizeUserGroupIds(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.groupIds) && data.groupIds.length > 0) return data.groupIds;
  return [];
}

/**
 * Migrate all existing user documents from single group to multi-group.
 * No-op: PostgreSQL uses a junction table from the start, so no migration is needed.
 */
export async function migrateAllUsersToMultiGroup(): Promise<number> {
  // No-op: PostgreSQL uses a user_groups junction table from the start.
  return 0;
}
