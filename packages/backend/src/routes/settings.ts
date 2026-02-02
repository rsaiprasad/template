import { Hono } from 'hono';
import { z } from 'zod';
import { logAuditAction } from '../middleware/audit';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { GroupService } from '../services/group.service';
import { SettingsService } from '../services/settings.service';
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
  const settingsService = new SettingsService();

  try {
    const settings = await settingsService.getSettings();

    // Also return the default group details
    const groupService = new GroupService();
    const defaultGroup = await groupService.getGroup(settings.defaultGroupId);

    return successResponse(c, {
      ...settings,
      defaultGroup: defaultGroup || null,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return internalError(c, 'Failed to fetch settings');
  }
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
    const groupService = new GroupService();
    const group = await groupService.getGroup(result.data.defaultGroupId);
    if (!group) {
      return notFound(c, 'Default group');
    }
  }

  const settingsService = new SettingsService();

  try {
    // Get existing settings for audit
    const existingSettings = await settingsService.getSettings();

    // Update settings
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
        'GROUP_UPDATED', // Using existing audit action type that fits
        'settings',
        'app',
        'Updated application settings',
        { before, after: changes }
      );
    }

    // Return settings with default group details
    const groupService = new GroupService();
    const defaultGroup = await groupService.getGroup(updatedSettings.defaultGroupId);

    return successResponse(c, {
      ...updatedSettings,
      defaultGroup: defaultGroup || null,
    });
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'GROUP_NOT_FOUND') {
      return notFound(c, 'Default group');
    }

    console.error('Error updating settings:', error);
    return internalError(c, 'Failed to update settings');
  }
});

/**
 * GET /api/v1/settings/features
 * Get feature flags only
 */
settingsRoutes.get('/features', requirePermission('settings:read'), async (c) => {
  const settingsService = new SettingsService();

  try {
    const settings = await settingsService.getSettings();
    return successResponse(c, settings.features);
  } catch (error) {
    console.error('Error fetching features:', error);
    return internalError(c, 'Failed to fetch features');
  }
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

  const settingsService = new SettingsService();

  try {
    // Get existing value for audit
    const existingSettings = await settingsService.getSettings();
    const existingValue = existingSettings.features[feature];

    // Toggle feature
    const updatedSettings = await settingsService.toggleFeature(
      feature,
      result.data.enabled,
      currentUser.uid
    );

    // Log audit if changed
    if (existingValue !== result.data.enabled) {
      await logAuditAction(
        c,
        'GROUP_UPDATED',
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
  } catch (error) {
    console.error('Error toggling feature:', error);
    return internalError(c, 'Failed to toggle feature');
  }
});

/**
 * POST /api/v1/settings/initialize
 * Initialize default settings and groups
 * This is typically called during initial setup
 */
settingsRoutes.post('/initialize', requirePermission('settings:update'), async (c) => {
  const groupService = new GroupService();
  const settingsService = new SettingsService();

  try {
    // Initialize default groups
    await groupService.initializeDefaultGroups();

    // Initialize settings
    const settings = await settingsService.initializeSettings();

    return successResponse(c, {
      message: 'Initialization complete',
      settings,
    });
  } catch (error) {
    console.error('Error initializing settings:', error);
    return internalError(c, 'Failed to initialize settings');
  }
});

export { settingsRoutes };
