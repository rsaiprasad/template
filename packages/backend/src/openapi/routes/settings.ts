import { createRoute } from '@hono/zod-openapi';
import {
  AppFeaturesSchema,
  ErrorResponseSchema,
  FeatureParamSchema,
  FeatureResponseSchema,
  InitializeResponseSchema,
  SettingsWithGroupSchema,
  SuccessResponseSchema,
  ToggleFeatureSchema,
  UpdateSettingsSchema,
} from '../schemas';

// GET /api/v1/settings - Get settings
export const getSettingsRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getSettings',
  tags: ['Settings'],
  summary: 'Get application settings',
  description: 'Retrieves the current application settings including the default group details.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Application settings',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(SettingsWithGroupSchema),
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
      description: 'Forbidden - User lacks required permission (settings:read)',
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

// PUT /api/v1/settings - Update settings
export const updateSettingsRoute = createRoute({
  method: 'put',
  path: '/',
  operationId: 'updateSettings',
  tags: ['Settings'],
  summary: 'Update application settings',
  description: 'Updates application settings including app name, default group, and feature flags.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateSettingsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated application settings',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(SettingsWithGroupSchema),
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
      description: 'Forbidden - User lacks required permission (settings:update)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - Default group does not exist',
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

// GET /api/v1/settings/features - Get feature flags
export const getFeaturesRoute = createRoute({
  method: 'get',
  path: '/features',
  operationId: 'getFeatures',
  tags: ['Settings'],
  summary: 'Get feature flags',
  description: 'Retrieves the current state of all feature flags.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Feature flags',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(AppFeaturesSchema),
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
      description: 'Forbidden - User lacks required permission (settings:read)',
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

// PUT /api/v1/settings/features/:feature - Toggle feature
export const toggleFeatureRoute = createRoute({
  method: 'put',
  path: '/features/{feature}',
  operationId: 'toggleFeature',
  tags: ['Settings'],
  summary: 'Toggle feature flag',
  description: 'Enables or disables a specific feature flag.',
  security: [{ bearerAuth: [] }],
  request: {
    params: FeatureParamSchema,
    body: {
      content: {
        'application/json': {
          schema: ToggleFeatureSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Feature toggle result',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(FeatureResponseSchema),
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid feature name or request body',
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
      description: 'Forbidden - User lacks required permission (settings:update)',
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

// POST /api/v1/settings/initialize - Initialize settings
export const initializeSettingsRoute = createRoute({
  method: 'post',
  path: '/initialize',
  operationId: 'initializeSettings',
  tags: ['Settings'],
  summary: 'Initialize settings',
  description: 'Initializes default settings and groups. Typically called during initial application setup.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Initialization result',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(InitializeResponseSchema),
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
      description: 'Forbidden - User lacks required permission (settings:update)',
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
