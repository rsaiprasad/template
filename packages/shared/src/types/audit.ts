export type AuditAction =
  // Auth
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  // Users
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DISABLED'
  | 'USER_ENABLED'
  | 'USER_DELETED'
  | 'USER_GROUP_CHANGED'
  // Groups
  | 'GROUP_CREATED'
  | 'GROUP_UPDATED'
  | 'GROUP_DELETED'
  | 'GROUP_PERMISSIONS_CHANGED';

export type AuditResource = 'users' | 'groups' | 'settings' | 'auth';

export interface AuditLogChanges {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  actorId: string;
  actorEmail: string;
  actorName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  description: string;
  changes?: AuditLogChanges;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateAuditLogInput {
  actorId: string;
  actorEmail: string;
  actorName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  description: string;
  changes?: AuditLogChanges;
  ipAddress?: string;
  userAgent?: string;
}
