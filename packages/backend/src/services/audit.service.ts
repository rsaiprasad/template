import type { AuditLog, AuditSearchParams, CreateAuditLogInput } from '@admin-dashboard/shared';
import {
  Collections,
  convertFirestoreDoc,
  convertFirestoreDocs,
  getDb,
} from '../core/lib/firebase-admin';

/**
 * Audit Service
 * Handles audit log creation and retrieval
 */
export class AuditService {
  private db = getDb();

  /**
   * Create an audit log entry
   */
  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    const logId = this.db.collection(Collections.AUDIT_LOGS).doc().id;
    const timestamp = new Date();

    const auditLog: Omit<AuditLog, 'id'> = {
      timestamp,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      description: input.description,
      changes: input.changes,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    };

    await this.db.collection(Collections.AUDIT_LOGS).doc(logId).set(auditLog);

    return { id: logId, ...auditLog };
  }

  /**
   * Get a single audit log by ID
   */
  async getAuditLog(logId: string): Promise<AuditLog | null> {
    const doc = await this.db.collection(Collections.AUDIT_LOGS).doc(logId).get();
    return convertFirestoreDoc<AuditLog>(doc);
  }

  /**
   * List audit logs with filtering and pagination
   */
  async listAuditLogs(
    params: AuditSearchParams = {}
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      actorId,
      startDate,
      endDate,
      sortOrder = 'desc',
    } = params;

    let baseQuery: FirebaseFirestore.Query = this.db.collection(Collections.AUDIT_LOGS);

    // Filter by action
    if (action) {
      baseQuery = baseQuery.where('action', '==', action);
    }

    // Filter by resource
    if (resource) {
      baseQuery = baseQuery.where('resource', '==', resource);
    }

    // Filter by actor
    if (actorId) {
      baseQuery = baseQuery.where('actorId', '==', actorId);
    }

    // Filter by date range
    if (startDate) {
      baseQuery = baseQuery.where('timestamp', '>=', new Date(startDate));
    }

    if (endDate) {
      baseQuery = baseQuery.where('timestamp', '<=', new Date(endDate));
    }

    // Get total count
    const countSnapshot = await baseQuery.count().get();
    const total = countSnapshot.data().count;

    // Apply sorting (always by timestamp)
    baseQuery = baseQuery.orderBy('timestamp', sortOrder === 'asc' ? 'asc' : 'desc');

    // Apply pagination
    const offset = (page - 1) * limit;
    baseQuery = baseQuery.offset(offset).limit(limit);

    const snapshot = await baseQuery.get();
    const logs = convertFirestoreDocs<AuditLog>(snapshot);

    return { logs, total };
  }

  /**
   * Get audit logs for a specific resource
   */
  async getAuditLogsForResource(
    resource: string,
    resourceId: string,
    limit = 50
  ): Promise<AuditLog[]> {
    const snapshot = await this.db
      .collection(Collections.AUDIT_LOGS)
      .where('resource', '==', resource)
      .where('resourceId', '==', resourceId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return convertFirestoreDocs<AuditLog>(snapshot);
  }

  /**
   * Get recent audit logs for a user (as actor)
   */
  async getAuditLogsForUser(userId: string, limit = 50): Promise<AuditLog[]> {
    const snapshot = await this.db
      .collection(Collections.AUDIT_LOGS)
      .where('actorId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return convertFirestoreDocs<AuditLog>(snapshot);
  }

  /**
   * Get audit log statistics
   */
  async getAuditStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalLogs: number;
    byAction: Record<string, number>;
    byResource: Record<string, number>;
  }> {
    let query: FirebaseFirestore.Query = this.db.collection(Collections.AUDIT_LOGS);

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }

    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    const snapshot = await query.get();
    const logs = convertFirestoreDocs<AuditLog>(snapshot);

    const byAction: Record<string, number> = {};
    const byResource: Record<string, number> = {};

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byResource[log.resource] = (byResource[log.resource] || 0) + 1;
    }

    return {
      totalLogs: logs.length,
      byAction,
      byResource,
    };
  }

  /**
   * Clean up old audit logs
   * Deletes logs older than the specified retention period
   */
  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const snapshot = await this.db
      .collection(Collections.AUDIT_LOGS)
      .where('timestamp', '<', cutoffDate)
      .limit(500) // Process in batches
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return snapshot.size;
  }
}
