import { createRoute } from '@hono/zod-openapi';
import {
  CreateGroupSchema,
  ErrorResponseSchema,
  GroupQuerySchema,
  GroupSchema,
  GroupWithUserCountSchema,
  IdParamSchema,
  MessageResponseSchema,
  SuccessResponseSchema,
  UpdateGroupPermissionsSchema,
  UpdateGroupSchema,
  UserSchema,
} from '../schemas';

// GET /api/v1/groups - List groups
export const listGroupsRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'listGroups',
  tags: ['Groups'],
  summary: 'List all groups',
  description: 'Retrieves a list of all groups. Optionally includes user counts for each group.',
  security: [{ bearerAuth: [] }],
  request: {
    query: GroupQuerySchema,
  },
  responses: {
    200: {
      description: 'List of groups',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(GroupWithUserCountSchema.array()),
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
      description: 'Forbidden - User lacks required permission (groups:list)',
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

// POST /api/v1/groups - Create group
export const createGroupRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createGroup',
  tags: ['Groups'],
  summary: 'Create a new group',
  description: 'Creates a new group with the specified name, description, and optional initial permissions.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateGroupSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Group created successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(GroupSchema),
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid request body or invalid permissions',
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
      description: 'Forbidden - User lacks required permission (groups:create)',
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

// GET /api/v1/groups/:id - Get group by ID
export const getGroupRoute = createRoute({
  method: 'get',
  path: '/{id}',
  operationId: 'getGroup',
  tags: ['Groups'],
  summary: 'Get group by ID',
  description: 'Retrieves detailed information about a specific group.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Group details',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(GroupSchema),
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
      description: 'Forbidden - User lacks required permission (groups:read)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - Group does not exist',
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

// PUT /api/v1/groups/:id - Update group
export const updateGroupRoute = createRoute({
  method: 'put',
  path: '/{id}',
  operationId: 'updateGroup',
  tags: ['Groups'],
  summary: 'Update group',
  description: 'Updates a group\'s name and/or description.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateGroupSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated group details',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(GroupSchema),
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid request body',
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
      description: 'Forbidden - User lacks required permission (groups:update)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - Group does not exist',
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

// DELETE /api/v1/groups/:id - Delete group
export const deleteGroupRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  operationId: 'deleteGroup',
  tags: ['Groups'],
  summary: 'Delete group',
  description: 'Permanently deletes a group. Cannot delete system groups or the default group. Cannot delete groups that still have users.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Group deleted successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(MessageResponseSchema),
        },
      },
    },
    400: {
      description: 'Bad Request - Cannot delete system group, default group, or group with users',
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
      description: 'Forbidden - User lacks required permission (groups:delete)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - Group does not exist',
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

// GET /api/v1/groups/:id/users - Get users in group
export const getGroupUsersRoute = createRoute({
  method: 'get',
  path: '/{id}/users',
  operationId: 'getGroupUsers',
  tags: ['Groups'],
  summary: 'Get users in group',
  description: 'Retrieves a list of all users that belong to the specified group.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'List of users in the group',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(UserSchema.array()),
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
      description: 'Forbidden - User lacks required permission (groups:read)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - Group does not exist',
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

// PUT /api/v1/groups/:id/permissions - Update group permissions
export const updateGroupPermissionsRoute = createRoute({
  method: 'put',
  path: '/{id}/permissions',
  operationId: 'updateGroupPermissions',
  tags: ['Groups'],
  summary: 'Update group permissions',
  description: 'Replaces all permissions for a group with the specified list of permissions.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateGroupPermissionsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Group permissions updated successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(GroupSchema),
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid permissions',
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
      description: 'Forbidden - User lacks required permission (groups:update)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - Group does not exist',
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
