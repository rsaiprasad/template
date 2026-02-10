import { createRoute } from '@hono/zod-openapi';
import {
  AuditActionItemSchema,
  AuditLogSchema,
  AuditResourceItemSchema,
  AuditResourceParamSchema,
  AuditSearchQuerySchema,
  AuditStatsQuerySchema,
  AuditStatsSchema,
  AuditUserQuerySchema,
  ErrorResponseSchema,
  IdParamSchema,
  SuccessResponseSchema,
  UserIdParamSchema,
} from '../schemas';

// GET /api/v1/audit - List audit logs
export const listAuditLogsRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'listAuditLogs',
  tags: ['Audit'],
  summary: 'List audit logs',
  description: 'Retrieves a paginated list of audit logs with optional filtering by action, resource, actor, and date range.',
  security: [{ bearerAuth: [] }],
  request: {
    query: AuditSearchQuerySchema,
  },
  responses: {
    200: {
      description: 'List of audit logs with pagination metadata',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(AuditLogSchema.array()),
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid action, resource, or date format',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - User lacks required permission (audit:list)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    429: {
      description: 'Too Many Requests - Rate limit exceeded',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/v1/audit/stats - Get audit statistics
export const getAuditStatsRoute = createRoute({
  method: 'get',
  path: '/stats',
  operationId: 'getAuditStats',
  tags: ['Audit'],
  summary: 'Get audit statistics',
  description: 'Returns aggregated statistics about audit logs including counts by action type, resource, and most active users.',
  security: [{ bearerAuth: [] }],
  request: {
    query: AuditStatsQuerySchema,
  },
  responses: {
    200: {
      description: 'Audit statistics',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(AuditStatsSchema),
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid date format',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - User lacks required permission (audit:list)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/v1/audit/actions - Get valid audit actions
export const getAuditActionsRoute = createRoute({
  method: 'get',
  path: '/actions',
  operationId: 'getAuditActions',
  tags: ['Audit'],
  summary: 'Get valid audit actions',
  description: 'Returns a list of all valid audit action types with their categories and descriptions.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of audit actions',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(AuditActionItemSchema.array()),
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - User lacks required permission (audit:list)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/v1/audit/resources - Get valid audit resources
export const getAuditResourcesRoute = createRoute({
  method: 'get',
  path: '/resources',
  operationId: 'getAuditResources',
  tags: ['Audit'],
  summary: 'Get valid audit resources',
  description: 'Returns a list of all valid audit resource types.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of audit resources',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(AuditResourceItemSchema.array()),
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - User lacks required permission (audit:list)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/v1/audit/user/:userId - Get audit logs for a user
export const getAuditLogsForUserRoute = createRoute({
  method: 'get',
  path: '/user/{userId}',
  operationId: 'getAuditLogsForUser',
  tags: ['Audit'],
  summary: 'Get audit logs for a user',
  description: 'Retrieves audit logs where the specified user was the actor (performer of the action).',
  security: [{ bearerAuth: [] }],
  request: {
    params: UserIdParamSchema,
    query: AuditUserQuerySchema,
  },
  responses: {
    200: {
      description: 'List of audit logs for the user',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(AuditLogSchema.array()),
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - User lacks required permission (audit:list)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/v1/audit/resource/:resource/:resourceId - Get audit logs for a resource
export const getAuditLogsForResourceRoute = createRoute({
  method: 'get',
  path: '/resource/{resource}/{resourceId}',
  operationId: 'getAuditLogsForResource',
  tags: ['Audit'],
  summary: 'Get audit logs for a resource',
  description: 'Retrieves audit logs related to a specific resource (e.g., a particular user, group, or settings).',
  security: [{ bearerAuth: [] }],
  request: {
    params: AuditResourceParamSchema,
    query: AuditUserQuerySchema,
  },
  responses: {
    200: {
      description: 'List of audit logs for the resource',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(AuditLogSchema.array()),
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid resource type',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - User lacks required permission (audit:list)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/v1/audit/:id - Get audit log by ID
export const getAuditLogRoute = createRoute({
  method: 'get',
  path: '/{id}',
  operationId: 'getAuditLog',
  tags: ['Audit'],
  summary: 'Get audit log by ID',
  description: 'Retrieves detailed information about a specific audit log entry.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Audit log details',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(AuditLogSchema),
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - User lacks required permission (audit:list)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - Audit log does not exist',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});
