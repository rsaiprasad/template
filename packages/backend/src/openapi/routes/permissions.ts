import { createRoute } from '@hono/zod-openapi';
import {
  CheckPermissionParamSchema,
  CheckPermissionResponseSchema,
  ErrorResponseSchema,
  MyPermissionsResponseSchema,
  PermissionListResponseSchema,
  PermissionResourceSchema,
  SuccessResponseSchema,
} from '../schemas';

// GET /api/v1/permissions - List permissions
export const listPermissionsRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'listPermissions',
  tags: ['Permissions'],
  summary: 'List all permissions',
  description:
    'Returns all available permissions in the system. Super admins and users with groups:update permission see all permissions. Regular users only see their own permissions.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of permissions',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(PermissionListResponseSchema),
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

// GET /api/v1/permissions/my - Get my permissions
export const getMyPermissionsRoute = createRoute({
  method: 'get',
  path: '/my',
  operationId: 'getMyPermissions',
  tags: ['Permissions'],
  summary: 'Get my permissions',
  description: "Returns the current user's permissions. Super admins receive all permissions.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Current user permissions',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(MyPermissionsResponseSchema),
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

// GET /api/v1/permissions/check/:permission - Check permission
export const checkPermissionRoute = createRoute({
  method: 'get',
  path: '/check/{permission}',
  operationId: 'checkPermission',
  tags: ['Permissions'],
  summary: 'Check permission',
  description: 'Checks if the current user has a specific permission.',
  security: [{ bearerAuth: [] }],
  request: {
    params: CheckPermissionParamSchema,
  },
  responses: {
    200: {
      description: 'Permission check result',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(CheckPermissionResponseSchema),
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

// GET /api/v1/permissions/resources - List permission resources
export const listPermissionResourcesRoute = createRoute({
  method: 'get',
  path: '/resources',
  operationId: 'listPermissionResources',
  tags: ['Permissions'],
  summary: 'List permission resources',
  description: 'Returns all permission resource types with their associated permissions.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of permission resources',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(PermissionResourceSchema.array()),
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
