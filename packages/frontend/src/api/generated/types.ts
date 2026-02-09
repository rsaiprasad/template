/**
 * Generated TypeScript types from OpenAPI spec
 * DO NOT EDIT - This file is generated from the backend OpenAPI specification
 */

// ============================================================================
// Core API Response Types
// ============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

// ============================================================================
// User Types
// ============================================================================

export type UserStatus = 'active' | 'disabled';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserPreferences {
  theme: ThemePreference;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  groupIds: string[];
  isSuperAdmin: boolean;
  status: UserStatus;
  disabledAt?: Date | string;
  disabledBy?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastLoginAt: Date | string;
  preferences: UserPreferences;
}

export interface UserWithPermissions extends User {
  permissions: string[];
  groupNames: string[];
}

export interface UpdateUserRequest {
  displayName?: string;
  photoURL?: string | null;
  preferences?: Partial<UserPreferences>;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  pageSize?: number; // Alias for limit
  status?: 'active' | 'disabled' | 'all' | string;
  groupId?: string;
  query?: string;
  search?: string; // Alias for query
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
}

// ============================================================================
// Group Types
// ============================================================================

export interface Group {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  isSystem: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
  updatedBy: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface ListGroupsParams {
  page?: number;
  limit?: number;
  pageSize?: number; // Alias for limit
  query?: string;
  search?: string; // Alias for query
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Permission Types
// ============================================================================

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'list';

export type PermissionResource = 'users' | 'groups' | 'settings' | 'audit';

export type Permission = `${PermissionResource}:${PermissionAction}`;

export interface PermissionDefinition {
  resource: PermissionResource;
  action: PermissionAction;
  description: string;
}

// ============================================================================
// Audit Log Types
// ============================================================================

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DISABLED'
  | 'USER_ENABLED'
  | 'USER_DELETED'
  | 'USER_GROUP_CHANGED'
  | 'GROUP_CREATED'
  | 'GROUP_UPDATED'
  | 'GROUP_DELETED'
  | 'GROUP_PERMISSIONS_CHANGED'
  | 'SETTINGS_UPDATED';

export type AuditResource = 'users' | 'groups' | 'settings' | 'auth';

export interface AuditLogChanges {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  timestamp: Date | string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  action: string;
  resource: string;
  resourceId: string;
  description: string;
  changes?: AuditLogChanges;
  ipAddress?: string;
  userAgent?: string;
}

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  pageSize?: number; // Alias for limit
  actorId?: string;
  userId?: string; // Alias for actorId
  action?: string;
  resource?: string;
  resourceType?: string; // Alias for resource
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditStats {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByResource: Record<string, number>;
  recentActivity: AuditLog[];
}

// ============================================================================
// Settings Types
// ============================================================================

export interface AppFeatures {
  auditLogging: boolean;
  userRegistration: boolean;
}

export interface Settings {
  id: 'app';
  appName: string;
  defaultGroupId: string;
  features: AppFeatures;
  updatedAt: Date | string;
  updatedBy: string;
}

export interface UpdateSettingsRequest {
  appName?: string;
  defaultGroupId?: string;
  features?: Partial<AppFeatures>;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface LoginRequest {
  idToken: string;
}

export interface LoginResponse {
  user: UserWithPermissions;
  message: string;
}

export interface LogoutResponse {
  message: string;
}

export interface VerifyAuthResponse {
  authenticated: boolean;
  userId?: string;
  email?: string;
}
