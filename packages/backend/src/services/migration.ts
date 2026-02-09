import { Collections, getDb } from '../core/lib/firebase-admin';

/**
 * Normalize a Firestore user document's group fields to the new `groupIds` array format.
 * Handles backward compatibility with old `groupId: string` documents.
 */
export function normalizeUserGroupIds(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.groupIds) && data.groupIds.length > 0) return data.groupIds;
  if (typeof data.groupId === 'string' && data.groupId) return [data.groupId];
  return [];
}

/**
 * Migrate all existing user documents from `groupId` (string) to `groupIds` (string[]).
 * Idempotent — skips users that already have a `groupIds` array.
 */
export async function migrateAllUsersToMultiGroup(): Promise<number> {
  const db = getDb();
  const snapshot = await db.collection(Collections.USERS).get();

  let migrated = 0;
  const batchSize = 500;
  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if already migrated
    if (Array.isArray(data.groupIds) && data.groupIds.length > 0) continue;

    const groupIds = normalizeUserGroupIds(data);
    batch.update(doc.ref, { groupIds });
    migrated++;
    count++;

    if (count >= batchSize) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  if (migrated > 0) {
    console.log(`Migrated ${migrated} user(s) from groupId to groupIds`);
  }

  return migrated;
}
