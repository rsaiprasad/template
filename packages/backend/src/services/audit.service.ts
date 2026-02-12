import type { AuditLog, AuditSearchParams, CreateAuditLogInput } from '@admin-dashboard/shared';
import { and, count, desc, asc, eq, gte, lte, lt } from 'drizzle-orm';
import { db } from '../db';
import { auditLogs } from '../db/schema';

/**
 * Audit Service
 * Handles audit log creation and retrieval
 */
export class AuditService {
  /**
   * Create an audit log entry
   */
  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    const id = crypto.randomUUID();
    const timestamp = new Date();

    const values = {
      id,
      timestamp,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      description: input.description,
      ...(input.changes !== undefined && { changes: input.changes }),
      ...(input.ipAddress !== undefined && { ipAddress: input.ipAddress }),
      ...(input.userAgent !== undefined && { userAgent: input.userAgent }),
    };

    const [row] = await db.insert(auditLogs).values(values).returning();

    return this.toAuditLog(row!);
  }

  /**
   * Get a single audit log by ID
   */
  async getAuditLog(logId: string): Promise<AuditLog | null> {
    const [row] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, logId));

    return row ? this.toAuditLog(row) : null;
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

    // Build dynamic where conditions
    const conditions = [];

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (resource) {
      conditions.push(eq(auditLogs.resource, resource));
    }

    if (actorId) {
      conditions.push(eq(auditLogs.actorId, actorId));
    }

    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereClause);
    const total = countResult?.count ?? 0;

    // Apply sorting and pagination
    const offset = (page - 1) * limit;
    const orderByClause = sortOrder === 'asc' ? asc(auditLogs.timestamp) : desc(auditLogs.timestamp);

    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(orderByClause)
      .offset(offset)
      .limit(limit);

    const logs = rows.map((row) => this.toAuditLog(row));

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
    const rows = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resource, resource),
          eq(auditLogs.resourceId, resourceId)
        )
      )
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    return rows.map((row) => this.toAuditLog(row));
  }

  /**
   * Get recent audit logs for a user (as actor)
   */
  async getAuditLogsForUser(userId: string, limit = 50): Promise<AuditLog[]> {
    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.actorId, userId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    return rows.map((row) => this.toAuditLog(row));
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
    const conditions = [];

    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, startDate));
    }

    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Use count() for efficient total
    const [countResult] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereClause);
    const totalLogs = countResult?.count ?? 0;

    // Cap the breakdown query to prevent OOM on large datasets
    const rows = await db
      .select({
        action: auditLogs.action,
        resource: auditLogs.resource,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(10000);

    const byAction: Record<string, number> = {};
    const byResource: Record<string, number> = {};

    for (const row of rows) {
      byAction[row.action] = (byAction[row.action] || 0) + 1;
      byResource[row.resource] = (byResource[row.resource] || 0) + 1;
    }

    return {
      totalLogs,
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

    const result = await db
      .delete(auditLogs)
      .where(lt(auditLogs.timestamp, cutoffDate))
      .returning({ id: auditLogs.id });

    return result.length;
  }

  /**
   * Convert a Drizzle row to an AuditLog
   */
  private toAuditLog(row: typeof auditLogs.$inferSelect): AuditLog {
    return {
      id: row.id,
      timestamp: row.timestamp,
      actorId: row.actorId,
      actorEmail: row.actorEmail,
      actorName: row.actorName,
      action: row.action as AuditLog['action'],
      resource: row.resource as AuditLog['resource'],
      resourceId: row.resourceId,
      description: row.description,
      ...(row.changes !== undefined && row.changes !== null && { changes: row.changes as AuditLog['changes'] }),
      ...(row.ipAddress !== undefined && row.ipAddress !== null && { ipAddress: row.ipAddress }),
      ...(row.userAgent !== undefined && row.userAgent !== null && { userAgent: row.userAgent }),
    };
  }
}
