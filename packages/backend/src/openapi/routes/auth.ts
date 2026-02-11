import { createRoute } from '@hono/zod-openapi';
import {
  ErrorResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  SuccessResponseSchema,
  UserWithPermissionsSchema,
  VerifyResponseSchema,
} from '../schemas';

// POST /api/v1/auth/login - User login
export const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  operationId: 'login',
  tags: ['Auth'],
  summary: 'User login',
  description:
    'Authenticates a user using a Firebase ID token. Creates or updates the user record on successful authentication.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(LoginResponseSchema),
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
      description: 'Unauthorized - Invalid or expired token',
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

// POST /api/v1/auth/logout - User logout
export const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  operationId: 'logout',
  tags: ['Auth'],
  summary: 'User logout',
  description: 'Records the user logout event in the audit log.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Logout successful',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(LogoutResponseSchema),
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

// GET /api/v1/auth/me - Get current user
export const getMeRoute = createRoute({
  method: 'get',
  path: '/me',
  operationId: 'getCurrentUser',
  tags: ['Auth'],
  summary: 'Get current user',
  description: "Returns the current authenticated user's information including their permissions.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Current user information',
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

// GET /api/v1/auth/verify - Verify token
export const verifyRoute = createRoute({
  method: 'get',
  path: '/verify',
  operationId: 'verifyAuth',
  tags: ['Auth'],
  summary: 'Verify authentication status',
  description:
    'Checks if the current token is valid and returns basic user information if authenticated.',
  responses: {
    200: {
      description: 'Verification result',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(VerifyResponseSchema),
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
