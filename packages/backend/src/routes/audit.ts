import { Hono } from 'hono';
import type { AppEnv } from '../types/context';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { AuditService } from '../services/audit.service';
import {
  successResponse,
  paginatedResponse,
  notFound,
  badRequest,
} from '../utils/response';
import type { AuditSearchParams, AuditAction, AuditResource } from '@admin-dashboard/shared';

const auditRoutes = new Hono<AppEnv>();

// Apply auth middleware to all routes
auditRoutes.use('*', authMiddleware);

// Valid audit actions and resources for validation
const VALID_ACTIONS: AuditAction[] = [
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DISABLED',
  'USER_ENABLED',
  'USER_DELETED',
  'USER_GROUP_CHANGED',
  'GROUP_CREATED',
  'GROUP_UPDATED',
  'GROUP_DELETED',
  'GROUP_PERMISSIONS_CHANGED',
];

const VALID_RESOURCES: AuditResource[] = ['users', 'groups', 'settings', 'auth'];

/**
 * GET /api/v1/audit
 * List audit logs with filtering and pagination
 */
auditRoutes.get('/', requirePermission('audit:list'), async (c) => {
  // Parse query parameters
  const params: AuditSearchParams = {
    page: parseInt(c.req.query('page') || '1'),
    limit: Math.min(parseInt(c.req.query('limit') || '50'), 100),
    action: c.req.query('action') || undefined,
    resource: c.req.query('resource') || undefined,
    actorId: c.req.query('actorId') || undefined,
    startDate: c.req.query('startDate') || undefined,
    endDate: c.req.query('endDate') || undefined,
    sortOrder: (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc',
  };

  // Validate action if provided
  if (params.action && !VALID_ACTIONS.includes(params.action as AuditAction)) {
    return badRequest(c, `Invalid action. Valid actions: ${VALID_ACTIONS.join(', ')}`);
  }

  // Validate resource if provided
  if (params.resource && !VALID_RESOURCES.includes(params.resource as AuditResource)) {
    return badRequest(c, `Invalid resource. Valid resources: ${VALID_RESOURCES.join(', ')}`);
  }

  // Validate date formats if provided
  if (params.startDate && isNaN(Date.parse(params.startDate))) {
    return badRequest(c, 'Invalid startDate format. Use ISO 8601 format.');
  }

  if (params.endDate && isNaN(Date.parse(params.endDate))) {
    return badRequest(c, 'Invalid endDate format. Use ISO 8601 format.');
  }

  const auditService = new AuditService();
  const { logs, total } = await auditService.listAuditLogs(params);

  return paginatedResponse(c, logs, {
    page: params.page!,
    limit: params.limit!,
    total,
  });
});

/**
 * GET /api/v1/audit/stats
 * Get audit log statistics
 */
auditRoutes.get('/stats', requirePermission('audit:list'), async (c) => {
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  // Validate date formats if provided
  if (startDate && isNaN(Date.parse(startDate))) {
    return badRequest(c, 'Invalid startDate format. Use ISO 8601 format.');
  }

  if (endDate && isNaN(Date.parse(endDate))) {
    return badRequest(c, 'Invalid endDate format. Use ISO 8601 format.');
  }

  const auditService = new AuditService();
  const stats = await auditService.getAuditStats(
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );

  return successResponse(c, stats);
});

/**
 * GET /api/v1/audit/actions
 * Get list of valid audit actions
 */
auditRoutes.get('/actions', requirePermission('audit:list'), (c) => {
  const actions = VALID_ACTIONS.map((action) => ({
    id: action,
    category: getActionCategory(action),
    description: getActionDescription(action),
  }));

  return successResponse(c, actions);
});

/**
 * GET /api/v1/audit/resources
 * Get list of valid audit resources
 */
auditRoutes.get('/resources', requirePermission('audit:list'), (c) => {
  const resources = VALID_RESOURCES.map((resource) => ({
    id: resource,
    name: resource.charAt(0).toUpperCase() + resource.slice(1),
  }));

  return successResponse(c, resources);
});

/**
 * GET /api/v1/audit/user/:userId
 * Get audit logs for a specific user (as actor)
 */
auditRoutes.get('/user/:userId', requirePermission('audit:list'), async (c) => {
  const userId = c.req.param('userId');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

  const auditService = new AuditService();
  const logs = await auditService.getAuditLogsForUser(userId, limit);

  return successResponse(c, logs);
});

/**
 * GET /api/v1/audit/resource/:resource/:resourceId
 * Get audit logs for a specific resource
 */
auditRoutes.get('/resource/:resource/:resourceId', requirePermission('audit:list'), async (c) => {
  const resource = c.req.param('resource');
  const resourceId = c.req.param('resourceId');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

  // Validate resource
  if (!VALID_RESOURCES.includes(resource as AuditResource)) {
    return badRequest(c, `Invalid resource. Valid resources: ${VALID_RESOURCES.join(', ')}`);
  }

  const auditService = new AuditService();
  const logs = await auditService.getAuditLogsForResource(resource, resourceId, limit);

  return successResponse(c, logs);
});

/**
 * GET /api/v1/audit/:id
 * Get a single audit log by ID
 */
auditRoutes.get('/:id', requirePermission('audit:read'), async (c) => {
  const logId = c.req.param('id');
  const auditService = new AuditService();

  const log = await auditService.getAuditLog(logId);

  if (!log) {
    return notFound(c, 'Audit log');
  }

  return successResponse(c, log);
});

/**
 * Helper function to categorize audit actions
 */
function getActionCategory(action: AuditAction): string {
  if (action.startsWith('USER_')) return 'Users';
  if (action.startsWith('GROUP_')) return 'Groups';
  if (action.startsWith('LOGIN') || action === 'LOGOUT') return 'Authentication';
  return 'Other';
}

/**
 * Helper function to get action descriptions
 */
function getActionDescription(action: AuditAction): string {
  const descriptions: Record<AuditAction, string> = {
    LOGIN: 'User logged in',
    LOGOUT: 'User logged out',
    LOGIN_FAILED: 'Login attempt failed',
    USER_CREATED: 'New user was created',
    USER_UPDATED: 'User was updated',
    USER_DISABLED: 'User was disabled',
    USER_ENABLED: 'User was enabled',
    USER_DELETED: 'User was deleted',
    USER_GROUP_CHANGED: 'User group was changed',
    GROUP_CREATED: 'New group was created',
    GROUP_UPDATED: 'Group was updated',
    GROUP_DELETED: 'Group was deleted',
    GROUP_PERMISSIONS_CHANGED: 'Group permissions were changed',
  };

  return descriptions[action] || action;
}

export { auditRoutes };
