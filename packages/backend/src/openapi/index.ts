import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../core/types/context';

// Import route definitions
import * as auditRoutes from './routes/audit';
import * as authRoutes from './routes/auth';
import * as groupRoutes from './routes/groups';
import * as permissionRoutes from './routes/permissions';
import * as settingsRoutes from './routes/settings';
import * as userRoutes from './routes/users';

// OpenAPI document configuration
const openAPIConfig = {
  openapi: '3.1.0' as const,
  info: {
    title: 'Admin Dashboard API',
    version: '1.0.0',
    description: `
# Admin Dashboard API

A comprehensive REST API for the Admin Dashboard application, providing user management, group management, permissions, audit logging, and application settings.

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

\`\`\`
Authorization: Bearer <firebase_id_token>
\`\`\`

The token should be a valid Firebase ID token obtained from the client-side Firebase Authentication SDK.

## Rate Limiting

API requests are rate-limited to prevent abuse. When rate limits are exceeded, you will receive a 429 Too Many Requests response.

Rate limit headers included in responses:
- \`X-RateLimit-Limit\`: Maximum requests allowed in the window
- \`X-RateLimit-Remaining\`: Requests remaining in the current window
- \`X-RateLimit-Reset\`: Unix timestamp when the window resets

## Pagination

List endpoints support pagination using query parameters:
- \`page\`: Page number (1-indexed, default: 1)
- \`limit\`: Items per page (default: 20, max: 100)

Some endpoints also support cursor-based pagination via the \`cursor\` parameter.

Paginated responses include metadata:
\`\`\`json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true,
    "nextCursor": "abc123"
  }
}
\`\`\`

## Error Handling

Error responses follow a consistent format:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
\`\`\`

Common error codes:
- \`UNAUTHORIZED\`: Authentication required or token invalid
- \`FORBIDDEN\`: User lacks required permission
- \`NOT_FOUND\`: Requested resource does not exist
- \`VALIDATION_ERROR\`: Request body validation failed
- \`INTERNAL_ERROR\`: Server-side error
    `.trim(),
    contact: {
      name: 'API Support',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentication endpoints for login, logout, and session verification',
    },
    {
      name: 'Users',
      description: 'User management endpoints for listing, viewing, updating, and deleting users',
    },
    {
      name: 'Groups',
      description: 'Group management endpoints for organizing users and assigning permissions',
    },
    {
      name: 'Permissions',
      description: 'Permission management endpoints for viewing and checking user permissions',
    },
    {
      name: 'Settings',
      description: 'Application settings management including feature flags',
    },
    {
      name: 'Audit',
      description: 'Audit log endpoints for viewing system activity and changes',
    },
  ],
};

// Placeholder handler that returns 501 - these routes are for documentation only
// The actual implementation is in the main routes folder
const notImplementedHandler = () => {
  throw new Error('This route is handled by the main application');
};

/**
 * Creates and configures the OpenAPI documentation app with all routes registered
 */
function createOpenAPIAppWithRoutes() {
  const app = new OpenAPIHono<AppEnv>();

  // Auth routes - prefixed with /auth
  const authApp = new OpenAPIHono<AppEnv>();
  authApp.openapi(authRoutes.loginRoute, notImplementedHandler);
  authApp.openapi(authRoutes.logoutRoute, notImplementedHandler);
  authApp.openapi(authRoutes.getMeRoute, notImplementedHandler);
  authApp.openapi(authRoutes.verifyRoute, notImplementedHandler);
  app.route('/auth', authApp);

  // User routes - prefixed with /users
  const usersApp = new OpenAPIHono<AppEnv>();
  usersApp.openapi(userRoutes.listUsersRoute, notImplementedHandler);
  usersApp.openapi(userRoutes.getUserRoute, notImplementedHandler);
  usersApp.openapi(userRoutes.updateUserRoute, notImplementedHandler);
  usersApp.openapi(userRoutes.deleteUserRoute, notImplementedHandler);
  usersApp.openapi(userRoutes.disableUserRoute, notImplementedHandler);
  usersApp.openapi(userRoutes.enableUserRoute, notImplementedHandler);
  usersApp.openapi(userRoutes.changeUserGroupRoute, notImplementedHandler);
  app.route('/users', usersApp);

  // Group routes - prefixed with /groups
  const groupsApp = new OpenAPIHono<AppEnv>();
  groupsApp.openapi(groupRoutes.listGroupsRoute, notImplementedHandler);
  groupsApp.openapi(groupRoutes.createGroupRoute, notImplementedHandler);
  groupsApp.openapi(groupRoutes.getGroupRoute, notImplementedHandler);
  groupsApp.openapi(groupRoutes.updateGroupRoute, notImplementedHandler);
  groupsApp.openapi(groupRoutes.deleteGroupRoute, notImplementedHandler);
  groupsApp.openapi(groupRoutes.getGroupUsersRoute, notImplementedHandler);
  groupsApp.openapi(groupRoutes.updateGroupPermissionsRoute, notImplementedHandler);
  app.route('/groups', groupsApp);

  // Permission routes - prefixed with /permissions
  const permissionsApp = new OpenAPIHono<AppEnv>();
  permissionsApp.openapi(permissionRoutes.listPermissionsRoute, notImplementedHandler);
  permissionsApp.openapi(permissionRoutes.getMyPermissionsRoute, notImplementedHandler);
  permissionsApp.openapi(permissionRoutes.checkPermissionRoute, notImplementedHandler);
  permissionsApp.openapi(permissionRoutes.listPermissionResourcesRoute, notImplementedHandler);
  app.route('/permissions', permissionsApp);

  // Settings routes - prefixed with /settings
  const settingsApp = new OpenAPIHono<AppEnv>();
  settingsApp.openapi(settingsRoutes.getSettingsRoute, notImplementedHandler);
  settingsApp.openapi(settingsRoutes.updateSettingsRoute, notImplementedHandler);
  settingsApp.openapi(settingsRoutes.getFeaturesRoute, notImplementedHandler);
  settingsApp.openapi(settingsRoutes.toggleFeatureRoute, notImplementedHandler);
  settingsApp.openapi(settingsRoutes.initializeSettingsRoute, notImplementedHandler);
  app.route('/settings', settingsApp);

  // Audit routes - prefixed with /audit
  const auditApp = new OpenAPIHono<AppEnv>();
  auditApp.openapi(auditRoutes.listAuditLogsRoute, notImplementedHandler);
  auditApp.openapi(auditRoutes.getAuditStatsRoute, notImplementedHandler);
  auditApp.openapi(auditRoutes.getAuditActionsRoute, notImplementedHandler);
  auditApp.openapi(auditRoutes.getAuditResourcesRoute, notImplementedHandler);
  auditApp.openapi(auditRoutes.getAuditLogsForUserRoute, notImplementedHandler);
  auditApp.openapi(auditRoutes.getAuditLogsForResourceRoute, notImplementedHandler);
  auditApp.openapi(auditRoutes.getAuditLogRoute, notImplementedHandler);
  app.route('/audit', auditApp);

  return app;
}

/**
 * Creates and configures the OpenAPI documentation app (for serving /doc endpoint)
 */
export function createOpenAPIApp() {
  const app = new OpenAPIHono<AppEnv>();

  // Register the /doc endpoint that returns the OpenAPI JSON spec
  app.get('/doc', (c) => {
    const spec = getOpenAPISpec();
    return c.json(spec);
  });

  return app;
}

/**
 * OpenAPI document type for export
 */
export interface OpenAPIDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: { name?: string };
    license?: { name?: string };
  };
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  paths: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
}

/**
 * Get the OpenAPI specification object
 */
export function getOpenAPISpec(): OpenAPIDocument {
  const app = createOpenAPIAppWithRoutes();

  // Generate the OpenAPI document
  const doc = app.getOpenAPI31Document({
    ...openAPIConfig,
  });

  // Add security schemes to components
  if (!doc.components) {
    doc.components = {};
  }
  doc.components.securitySchemes = {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Firebase ID token',
    },
  };

  return doc as OpenAPIDocument;
}

// Export route definitions for documentation reference
export * from './routes/auth';
export * from './routes/users';
export * from './routes/groups';
export * from './routes/permissions';
export * from './routes/settings';
export * from './routes/audit';
export * from './schemas';
