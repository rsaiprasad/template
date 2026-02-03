import { createRoute } from '@hono/zod-openapi';
import {
  ChangeGroupSchema,
  ErrorResponseSchema,
  IdParamSchema,
  MessageResponseSchema,
  SuccessResponseSchema,
  UpdateUserSchema,
  UserSchema,
  UserSearchQuerySchema,
  UserWithPermissionsSchema,
} from '../schemas';

// GET /api/v1/users - List users
export const listUsersRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'listUsers',
  tags: ['Users'],
  summary: 'List all users',
  description: 'Retrieves a paginated list of users with optional filtering by status, group, and search query. Supports cursor-based pagination.',
  security: [{ bearerAuth: [] }],
  request: {
    query: UserSearchQuerySchema,
  },
  responses: {
    200: {
      description: 'List of users with pagination metadata',
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
      description: 'Forbidden - User lacks required permission (users:list)',
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

// GET /api/v1/users/:id - Get user by ID
export const getUserRoute = createRoute({
  method: 'get',
  path: '/{id}',
  operationId: 'getUser',
  tags: ['Users'],
  summary: 'Get user by ID',
  description: 'Retrieves detailed information about a specific user including their permissions.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'User details with permissions',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(UserWithPermissionsSchema),
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
      description: 'Forbidden - User lacks required permission (users:read)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - User does not exist',
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

// PUT /api/v1/users/:id - Update user
export const updateUserRoute = createRoute({
  method: 'put',
  path: '/{id}',
  operationId: 'updateUser',
  tags: ['Users'],
  summary: 'Update user',
  description: 'Updates a user\'s display name, photo URL, or preferences. Cannot modify super administrator accounts unless you are also a super admin.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated user details',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(UserSchema),
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
      description: 'Forbidden - User lacks required permission (users:update) or trying to modify super admin',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - User does not exist',
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

// DELETE /api/v1/users/:id - Delete user
export const deleteUserRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  operationId: 'deleteUser',
  tags: ['Users'],
  summary: 'Delete user',
  description: 'Permanently deletes a user. Cannot delete yourself or super administrator accounts.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'User deleted successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(MessageResponseSchema),
        },
      },
    },
    400: {
      description: 'Bad Request - Cannot delete yourself',
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
      description: 'Forbidden - User lacks required permission (users:delete) or trying to delete super admin',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - User does not exist',
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

// POST /api/v1/users/:id/disable - Disable user
export const disableUserRoute = createRoute({
  method: 'post',
  path: '/{id}/disable',
  operationId: 'disableUser',
  tags: ['Users'],
  summary: 'Disable user',
  description: 'Disables a user account, preventing them from logging in. Cannot disable yourself.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'User disabled successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(UserSchema),
        },
      },
    },
    400: {
      description: 'Bad Request - Cannot disable yourself',
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
      description: 'Forbidden - User lacks required permission (users:update)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - User does not exist',
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

// POST /api/v1/users/:id/enable - Enable user
export const enableUserRoute = createRoute({
  method: 'post',
  path: '/{id}/enable',
  operationId: 'enableUser',
  tags: ['Users'],
  summary: 'Enable user',
  description: 'Re-enables a previously disabled user account.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'User enabled successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(UserSchema),
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
      description: 'Forbidden - User lacks required permission (users:update)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - User does not exist',
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

// PUT /api/v1/users/:id/group - Change user group
export const changeUserGroupRoute = createRoute({
  method: 'put',
  path: '/{id}/group',
  operationId: 'changeUserGroup',
  tags: ['Users'],
  summary: 'Change user group',
  description: 'Changes the group a user belongs to, affecting their permissions. Cannot modify super administrator accounts unless you are also a super admin.',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: ChangeGroupSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User group changed successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(UserSchema),
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid group ID',
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
      description: 'Forbidden - User lacks required permission (users:update) or trying to modify super admin',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - User or group does not exist',
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
