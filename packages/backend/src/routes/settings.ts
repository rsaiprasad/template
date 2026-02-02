import { Hono } from 'hono';
import { z } from 'zod';
import { AppError } from '../errors';
import { logAuditAction } from '../middleware/audit';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { groupService, settingsService } from '../services';
import type { AppEnv } from '../types/context';
import { badRequest, internalError, notFound, successResponse } from '../utils/response';

const settingsRoutes = new Hono<AppEnv>();

// Apply auth middleware to all routes
settingsRoutes.use('*', authMiddleware);

// Validation schema for updating settings
const updateSettingsSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  defaultGroupId: z.string().min(1).optional(),
  features: z
    .object({
      auditLogging: z.boolean().optional(),
      userRegistration: z.boolean().optional(),
    })
    .optional(),
});

/**
 * GET /api/v1/settings
 * Get application settings
 */
settingsRoutes.get('/', requirePermission('settings:read'), async (c) => {
  const settings = await settingsService.getSettings();

  // Also return the default group details
  const defaultGroup = await groupService.getGroup(settings.defaultGroupId);

  return successResponse(c, {
    ...settings,
    defaultGroup: defaultGroup || null,
  });
});

/**
 * PUT /api/v1/settings
 * Update application settings
 */
settingsRoutes.put('/', requirePermission('settings:update'), async (c) => {
  const currentUser = c.get('user');

  // Parse and validate request body
  const body = await c.req.json();
  const result = updateSettingsSchema.safeParse(body);

  if (!result.success) {
    return badRequest(c, 'Invalid request body', result.error.errors);
  }

  // Validate defaultGroupId if provided
  if (result.data.defaultGroupId) {
    const group = await groupService.getGroup(result.data.defaultGroupId);
    if (!group) {
      return notFound(c, 'Default group');
    }
  }

  // Get existing settings for audit
  const existingSettings = await settingsService.getSettings();

  // Update settings - throws AppError on failure (handled by global error handler)
  const updatedSettings = await settingsService.updateSettings(result.data, currentUser.uid);

  // Log audit for each changed field
  const changes: Record<string, unknown> = {};
  const before: Record<string, unknown> = {};

  if (result.data.appName !== undefined && result.data.appName !== existingSettings.appName) {
    before.appName = existingSettings.appName;
    changes.appName = result.data.appName;
  }

  if (
    result.data.defaultGroupId !== undefined &&
    result.data.defaultGroupId !== existingSettings.defaultGroupId
  ) {
    before.defaultGroupId = existingSettings.defaultGroupId;
    changes.defaultGroupId = result.data.defaultGroupId;
  }

  if (result.data.features !== undefined) {
    const featureChanges: Record<string, boolean> = {};
    const featureBefore: Record<string, boolean> = {};

    if (
      result.data.features.auditLogging !== undefined &&
      result.data.features.auditLogging !== existingSettings.features.auditLogging
    ) {
      featureBefore.auditLogging = existingSettings.features.auditLogging;
      featureChanges.auditLogging = result.data.features.auditLogging;
    }

    if (
      result.data.features.userRegistration !== undefined &&
      result.data.features.userRegistration !== existingSettings.features.userRegistration
    ) {
      featureBefore.userRegistration = existingSettings.features.userRegistration;
      featureChanges.userRegistration = result.data.features.userRegistration;
    }

    if (Object.keys(featureChanges).length > 0) {
      before.features = featureBefore;
      changes.features = featureChanges;
    }
  }

  // Only log if there were actual changes
  if (Object.keys(changes).length > 0) {
    await logAuditAction(
      c,
      'SETTINGS_UPDATED',
      'settings',
      'app',
      'Updated application settings',
      { before, after: changes }
    );
  }

  // Return settings with default group details
  const defaultGroup = await groupService.getGroup(updatedSettings.defaultGroupId);

  return successResponse(c, {
    ...updatedSettings,
    defaultGroup: defaultGroup || null,
  });
});

/**
 * GET /api/v1/settings/features
 * Get feature flags only
 */
settingsRoutes.get('/features', requirePermission('settings:read'), async (c) => {
  const settings = await settingsService.getSettings();
  return successResponse(c, settings.features);
});

/**
 * PUT /api/v1/settings/features/:feature
 * Toggle a specific feature
 */
settingsRoutes.put('/features/:feature', requirePermission('settings:update'), async (c) => {
  const feature = c.req.param('feature') as 'auditLogging' | 'userRegistration';
  const currentUser = c.get('user');

  // Validate feature name
  const validFeatures = ['auditLogging', 'userRegistration'];
  if (!validFeatures.includes(feature)) {
    return badRequest(c, `Invalid feature. Valid features: ${validFeatures.join(', ')}`);
  }

  // Parse request body
  const body = await c.req.json();
  const schema = z.object({ enabled: z.boolean() });
  const result = schema.safeParse(body);

  if (!result.success) {
    return badRequest(c, 'Invalid request body', result.error.errors);
  }

  // Get existing value for audit
  const existingSettings = await settingsService.getSettings();
  const existingValue = existingSettings.features[feature];

  // Toggle feature - throws AppError on failure (handled by global error handler)
  const updatedSettings = await settingsService.toggleFeature(
    feature,
    result.data.enabled,
    currentUser.uid
  );

  // Log audit if changed
  if (existingValue !== result.data.enabled) {
    await logAuditAction(
      c,
      'SETTINGS_UPDATED',
      'settings',
      'app',
      `${result.data.enabled ? 'Enabled' : 'Disabled'} feature: ${feature}`,
      {
        before: { [feature]: existingValue },
        after: { [feature]: result.data.enabled },
      }
    );
  }

  return successResponse(c, {
    feature,
    enabled: updatedSettings.features[feature],
  });
});

/**
 * POST /api/v1/settings/initialize
 * Initialize default settings and groups
 * This is typically called during initial setup
 */
settingsRoutes.post('/initialize', requirePermission('settings:update'), async (c) => {
  // Initialize default groups
  await groupService.initializeDefaultGroups();

  // Initialize settings
  const settings = await settingsService.initializeSettings();

  return successResponse(c, {
    message: 'Initialization complete',
    settings,
  });
});

export { settingsRoutes };
