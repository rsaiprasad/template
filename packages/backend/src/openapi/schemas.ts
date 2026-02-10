import { z } from '@hono/zod-openapi';

// ============================================
// Common Schemas
// ============================================

export const IdParamSchema = z.object({
  id: z.string().openapi({
    description: 'Unique identifier',
    example: 'abc123xyz',
  }),
});

export const UserIdParamSchema = z.object({
  userId: z.string().openapi({
    description: 'User unique identifier',
    example: 'user_abc123',
  }),
});

// ============================================
// Pagination Schemas
// ============================================

export const PaginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .openapi({
      description: 'Page number (1-indexed)',
      example: '1',
    }),
  limit: z
    .string()
    .optional()
    .openapi({
      description: 'Number of items per page (max 100)',
      example: '20',
    }),
});

export const PaginationMetaSchema = z.object({
  page: z.number().openapi({ description: 'Current page number', example: 1 }),
  limit: z.number().openapi({ description: 'Items per page', example: 20 }),
  total: z.number().openapi({ description: 'Total number of items', example: 100 }),
  hasMore: z.boolean().openapi({ description: 'Whether there are more pages', example: true }),
  nextCursor: z.string().optional().openapi({ description: 'Cursor for next page (if using cursor-based pagination)' }),
});

// ============================================
// User Schemas
// ============================================

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).openapi({
    description: 'User theme preference',
    example: 'system',
  }),
});

export const UserSchema = z.object({
  id: z.string().openapi({ description: 'User unique identifier', example: 'user_abc123' }),
  email: z.string().email().openapi({ description: 'User email address', example: 'user@example.com' }),
  displayName: z.string().openapi({ description: 'User display name', example: 'John Doe' }),
  photoURL: z.string().url().nullable().openapi({ description: 'User profile photo URL', example: 'https://example.com/photo.jpg' }),
  groupIds: z.array(z.string()).openapi({ description: 'IDs of the groups the user belongs to', example: ['group_admin'] }),
  isSuperAdmin: z.boolean().openapi({ description: 'Whether the user is a super administrator', example: false }),
  status: z.enum(['active', 'disabled']).openapi({ description: 'User account status', example: 'active' }),
  disabledAt: z.string().datetime().optional().openapi({ description: 'When the user was disabled' }),
  disabledBy: z.string().optional().openapi({ description: 'ID of user who disabled this user' }),
  createdAt: z.string().datetime().openapi({ description: 'When the user was created', example: '2024-01-15T10:30:00Z' }),
  updatedAt: z.string().datetime().openapi({ description: 'When the user was last updated', example: '2024-01-15T10:30:00Z' }),
  lastLoginAt: z.string().datetime().openapi({ description: 'When the user last logged in', example: '2024-01-15T10:30:00Z' }),
  preferences: UserPreferencesSchema,
});

export const UserWithPermissionsSchema = UserSchema.extend({
  permissions: z.array(z.string()).openapi({ description: 'List of permission strings', example: ['users:read', 'users:list'] }),
  groupNames: z.array(z.string()).openapi({ description: 'Names of the user groups', example: ['Administrators'] }),
});

export const CreateUserSchema = z.object({
  email: z.string().email().openapi({ description: 'User email address', example: 'newuser@example.com' }),
  displayName: z.string().openapi({ description: 'User display name', example: 'Jane Doe' }),
  photoURL: z.string().url().nullable().optional().openapi({ description: 'User profile photo URL' }),
  groupIds: z.array(z.string()).optional().openapi({ description: 'IDs of the groups to assign the user to' }),
});

export const UpdateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional().openapi({ description: 'User display name', example: 'John Smith' }),
  photoURL: z.string().url().nullable().optional().openapi({ description: 'User profile photo URL' }),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
    })
    .optional()
    .openapi({ description: 'User preferences' }),
});

export const ChangeGroupSchema = z.object({
  groupId: z.string().min(1).openapi({ description: 'ID of the new group', example: 'group_users' }),
});

export const UserSearchQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(['active', 'disabled', 'all']).optional().openapi({ description: 'Filter by user status', example: 'active' }),
  groupId: z.string().optional().openapi({ description: 'Filter by group ID' }),
  query: z.string().optional().openapi({ description: 'Search query for email or name' }),
  sortBy: z.string().optional().openapi({ description: 'Field to sort by', example: 'createdAt' }),
  sortOrder: z.enum(['asc', 'desc']).optional().openapi({ description: 'Sort order', example: 'desc' }),
  cursor: z.string().optional().openapi({ description: 'Cursor for pagination' }),
});

// ============================================
// Group Schemas
// ============================================

export const GroupSchema = z.object({
  id: z.string().openapi({ description: 'Group unique identifier', example: 'group_admin' }),
  name: z.string().openapi({ description: 'Group name', example: 'Administrators' }),
  description: z.string().openapi({ description: 'Group description', example: 'Users with full administrative access' }),
  permissions: z.array(z.string()).openapi({ description: 'List of permissions assigned to this group', example: ['users:read', 'users:list', 'groups:read'] }),
  isDefault: z.boolean().openapi({ description: 'Whether this is the default group for new users', example: false }),
  isSystem: z.boolean().openapi({ description: 'Whether this is a system group that cannot be deleted', example: true }),
  createdAt: z.string().datetime().openapi({ description: 'When the group was created' }),
  updatedAt: z.string().datetime().openapi({ description: 'When the group was last updated' }),
  createdBy: z.string().openapi({ description: 'ID of user who created the group' }),
  updatedBy: z.string().openapi({ description: 'ID of user who last updated the group' }),
});

export const GroupWithUserCountSchema = GroupSchema.extend({
  userCount: z.number().openapi({ description: 'Number of users in this group', example: 5 }),
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100).openapi({ description: 'Group name', example: 'Editors' }),
  description: z.string().max(500).default('').openapi({ description: 'Group description', example: 'Users who can edit content' }),
  permissions: z.array(z.string()).optional().openapi({ description: 'List of permissions to assign', example: ['users:read', 'users:list'] }),
});

export const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional().openapi({ description: 'Group name' }),
  description: z.string().max(500).optional().openapi({ description: 'Group description' }),
});

export const UpdateGroupPermissionsSchema = z.object({
  permissions: z.array(z.string()).openapi({ description: 'New list of permissions', example: ['users:read', 'users:list', 'groups:read'] }),
});

export const GroupQuerySchema = z.object({
  includeUserCounts: z.enum(['true', 'false']).optional().openapi({ description: 'Include user count for each group' }),
});

// ============================================
// Audit Log Schemas
// ============================================

export const AuditActionSchema = z.enum([
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DISABLED',
  'USER_ENABLED',
  'USER_DELETED',
  'USER_GROUP_ADDED',
  'USER_GROUP_REMOVED',
  'GROUP_CREATED',
  'GROUP_UPDATED',
  'GROUP_DELETED',
  'GROUP_PERMISSIONS_CHANGED',
  'SETTINGS_UPDATED',
]);

export const AuditResourceSchema = z.enum(['users', 'groups', 'settings', 'auth']);

export const AuditLogChangesSchema = z.object({
  before: z.record(z.unknown()).openapi({ description: 'State before the change' }),
  after: z.record(z.unknown()).openapi({ description: 'State after the change' }),
});

export const AuditLogSchema = z.object({
  id: z.string().openapi({ description: 'Audit log unique identifier', example: 'audit_abc123' }),
  timestamp: z.string().datetime().openapi({ description: 'When the action occurred', example: '2024-01-15T10:30:00Z' }),
  actorId: z.string().openapi({ description: 'ID of the user who performed the action', example: 'user_abc123' }),
  actorEmail: z.string().email().openapi({ description: 'Email of the user who performed the action', example: 'admin@example.com' }),
  actorName: z.string().openapi({ description: 'Name of the user who performed the action', example: 'Admin User' }),
  action: AuditActionSchema.openapi({ description: 'Type of action performed', example: 'USER_UPDATED' }),
  resource: AuditResourceSchema.openapi({ description: 'Resource type affected', example: 'users' }),
  resourceId: z.string().openapi({ description: 'ID of the affected resource', example: 'user_xyz789' }),
  description: z.string().openapi({ description: 'Human-readable description of the action', example: 'Updated user john@example.com' }),
  changes: AuditLogChangesSchema.optional().openapi({ description: 'Details of what changed' }),
  ipAddress: z.string().optional().openapi({ description: 'IP address of the actor', example: '192.168.1.1' }),
  userAgent: z.string().optional().openapi({ description: 'User agent of the actor' }),
});

export const AuditSearchQuerySchema = PaginationQuerySchema.extend({
  action: z.string().optional().openapi({ description: 'Filter by action type' }),
  resource: z.string().optional().openapi({ description: 'Filter by resource type' }),
  actorId: z.string().optional().openapi({ description: 'Filter by actor ID' }),
  startDate: z.string().optional().openapi({ description: 'Filter by start date (ISO 8601)', example: '2024-01-01T00:00:00Z' }),
  endDate: z.string().optional().openapi({ description: 'Filter by end date (ISO 8601)', example: '2024-12-31T23:59:59Z' }),
  sortOrder: z.enum(['asc', 'desc']).optional().openapi({ description: 'Sort order', example: 'desc' }),
});

export const AuditStatsQuerySchema = z.object({
  startDate: z.string().optional().openapi({ description: 'Start date for stats (ISO 8601)' }),
  endDate: z.string().optional().openapi({ description: 'End date for stats (ISO 8601)' }),
});

export const AuditUserQuerySchema = z.object({
  limit: z.string().optional().openapi({ description: 'Maximum number of logs to return', example: '50' }),
});

export const AuditResourceParamSchema = z.object({
  resource: z.string().openapi({ description: 'Resource type', example: 'users' }),
  resourceId: z.string().openapi({ description: 'Resource ID', example: 'user_abc123' }),
});

export const AuditActionItemSchema = z.object({
  id: z.string().openapi({ description: 'Action identifier' }),
  category: z.string().openapi({ description: 'Action category', example: 'Users' }),
  description: z.string().openapi({ description: 'Action description' }),
});

export const AuditResourceItemSchema = z.object({
  id: z.string().openapi({ description: 'Resource identifier' }),
  name: z.string().openapi({ description: 'Resource name', example: 'Users' }),
});

export const AuditStatsSchema = z.object({
  totalActions: z.number().openapi({ description: 'Total number of actions', example: 150 }),
  actionsByType: z.record(z.number()).openapi({ description: 'Count of actions by type' }),
  actionsByResource: z.record(z.number()).openapi({ description: 'Count of actions by resource' }),
  topActors: z.array(z.object({
    actorId: z.string(),
    actorEmail: z.string(),
    count: z.number(),
  })).openapi({ description: 'Most active users' }),
});

// ============================================
// Settings Schemas
// ============================================

export const AppFeaturesSchema = z.object({
  auditLogging: z.boolean().openapi({ description: 'Whether audit logging is enabled', example: true }),
  userRegistration: z.boolean().openapi({ description: 'Whether user registration is enabled', example: true }),
});

export const SettingsSchema = z.object({
  id: z.literal('app').openapi({ description: 'Settings identifier (always "app")' }),
  appName: z.string().openapi({ description: 'Application name', example: 'Admin Dashboard' }),
  defaultGroupId: z.string().openapi({ description: 'Default group ID for new users', example: 'group_users' }),
  features: AppFeaturesSchema,
  updatedAt: z.string().datetime().openapi({ description: 'When settings were last updated' }),
  updatedBy: z.string().openapi({ description: 'ID of user who last updated settings' }),
});

export const SettingsWithGroupSchema = SettingsSchema.extend({
  defaultGroup: GroupSchema.nullable().openapi({ description: 'Default group details' }),
});

export const UpdateSettingsSchema = z.object({
  appName: z.string().min(1).max(100).optional().openapi({ description: 'Application name', example: 'My Dashboard' }),
  defaultGroupId: z.string().min(1).optional().openapi({ description: 'Default group ID for new users' }),
  features: z
    .object({
      auditLogging: z.boolean().optional(),
      userRegistration: z.boolean().optional(),
    })
    .optional()
    .openapi({ description: 'Feature flags' }),
});

export const ToggleFeatureSchema = z.object({
  enabled: z.boolean().openapi({ description: 'Whether to enable the feature', example: true }),
});

export const FeatureParamSchema = z.object({
  feature: z.enum(['auditLogging', 'userRegistration']).openapi({ description: 'Feature name' }),
});

export const FeatureResponseSchema = z.object({
  feature: z.string().openapi({ description: 'Feature name' }),
  enabled: z.boolean().openapi({ description: 'Whether the feature is enabled' }),
});

export const InitializeResponseSchema = z.object({
  message: z.string().openapi({ description: 'Success message' }),
  settings: SettingsSchema,
});

// ============================================
// Auth Schemas
// ============================================

export const LoginRequestSchema = z.object({
  idToken: z.string().min(1).openapi({ description: 'Firebase ID token from client authentication' }),
});

export const LoginResponseSchema = z.object({
  user: UserWithPermissionsSchema,
  message: z.string().openapi({ description: 'Success message', example: 'Login successful' }),
});

export const LogoutResponseSchema = z.object({
  message: z.string().openapi({ description: 'Success message', example: 'Logout successful' }),
});

export const VerifyResponseSchema = z.object({
  authenticated: z.boolean().openapi({ description: 'Whether the user is authenticated' }),
  userId: z.string().optional().openapi({ description: 'User ID if authenticated' }),
  email: z.string().optional().openapi({ description: 'User email if authenticated' }),
});

// ============================================
// Permission Schemas
// ============================================

export const PermissionDefinitionSchema = z.object({
  id: z.string().openapi({ description: 'Permission identifier', example: 'users:read' }),
  resource: z.string().openapi({ description: 'Resource type', example: 'users' }),
  action: z.string().openapi({ description: 'Action type', example: 'read' }),
  description: z.string().openapi({ description: 'Permission description', example: 'View user details' }),
});

export const PermissionListResponseSchema = z.object({
  permissions: z.array(PermissionDefinitionSchema),
  byResource: z.record(z.array(z.string())).openapi({ description: 'Permissions grouped by resource' }),
  total: z.number().openapi({ description: 'Total number of permissions' }),
});

export const MyPermissionsResponseSchema = z.object({
  permissions: z.array(z.string()).openapi({ description: 'List of permission identifiers' }),
  byResource: z.record(z.array(z.string())).openapi({ description: 'Permissions grouped by resource' }),
  isSuperAdmin: z.boolean().openapi({ description: 'Whether the user is a super admin' }),
  total: z.number().openapi({ description: 'Total number of permissions' }),
});

export const CheckPermissionParamSchema = z.object({
  permission: z.string().openapi({ description: 'Permission to check', example: 'users:read' }),
});

export const CheckPermissionResponseSchema = z.object({
  permission: z.string().openapi({ description: 'Permission that was checked' }),
  hasPermission: z.boolean().openapi({ description: 'Whether the user has the permission' }),
  reason: z.string().openapi({ description: 'Reason for the result' }),
});

export const PermissionResourceSchema = z.object({
  id: z.string().openapi({ description: 'Resource identifier' }),
  name: z.string().openapi({ description: 'Resource display name' }),
  description: z.string().openapi({ description: 'Resource description' }),
  permissions: z.array(z.string()).openapi({ description: 'Permissions for this resource' }),
});

// ============================================
// Response Wrapper Schemas
// ============================================

export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: PaginationMetaSchema.optional(),
  });

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().openapi({ description: 'Error code', example: 'UNAUTHORIZED' }),
    message: z.string().openapi({ description: 'Error message', example: 'Authentication required' }),
    details: z.unknown().optional().openapi({ description: 'Additional error details' }),
  }),
});

export const MessageResponseSchema = z.object({
  message: z.string().openapi({ description: 'Response message' }),
});

// ============================================
// Health Check Schema
// ============================================

export const HealthCheckSchema = z.object({
  status: z.string().openapi({ description: 'Health status', example: 'healthy' }),
  timestamp: z.string().datetime().openapi({ description: 'Current server timestamp' }),
  version: z.string().openapi({ description: 'API version', example: '1.0.0' }),
});
