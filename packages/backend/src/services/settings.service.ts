import type { AppSettings, UpdateSettingsInput } from '@admin-dashboard/shared';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../core/errors';
import { db } from '../db';
import { groups, settings } from '../db/schema';

/**
 * Settings Service
 * Handles application settings
 */
export class SettingsService {
  private readonly SETTINGS_DOC_ID = 'app' as const;

  /**
   * Get application settings
   */
  async getSettings(): Promise<AppSettings> {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.id, this.SETTINGS_DOC_ID));

    if (!row) {
      return this.getDefaultSettings();
    }

    return this.toAppSettings(row);
  }

  /**
   * Update application settings
   */
  async updateSettings(input: UpdateSettingsInput, updaterId: string): Promise<AppSettings> {
    const existingSettings = await this.getSettings();

    const updates: Partial<{
      appName: string;
      defaultGroupId: string;
      features: AppSettings['features'];
      updatedAt: Date;
      updatedBy: string;
    }> = {
      updatedAt: new Date(),
      updatedBy: updaterId,
    };

    if (input.appName !== undefined) {
      updates.appName = input.appName;
    }

    if (input.defaultGroupId !== undefined) {
      // Verify the group exists
      const [groupRow] = await db
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.id, input.defaultGroupId));

      if (!groupRow) {
        throw new NotFoundError('Group');
      }
      updates.defaultGroupId = input.defaultGroupId;

      // Update the isDefault flag on groups
      await this.updateDefaultGroup(existingSettings.defaultGroupId, input.defaultGroupId);
    }

    if (input.features !== undefined) {
      updates.features = {
        ...existingSettings.features,
        ...input.features,
      };
    }

    // Upsert: update if exists, insert if not
    const [updatedRow] = await db
      .insert(settings)
      .values({
        id: this.SETTINGS_DOC_ID,
        ...this.getDefaultSettingsValues(),
        ...updates,
      })
      .onConflictDoUpdate({
        target: settings.id,
        set: updates,
      })
      .returning();

    return this.toAppSettings(updatedRow!);
  }

  /**
   * Initialize settings with defaults
   */
  async initializeSettings(): Promise<AppSettings> {
    const defaultValues = this.getDefaultSettingsValues();

    await db
      .insert(settings)
      .values({
        id: this.SETTINGS_DOC_ID,
        ...defaultValues,
      })
      .onConflictDoNothing();

    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.id, this.SETTINGS_DOC_ID));

    return row ? this.toAppSettings(row) : this.getDefaultSettings();
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): AppSettings {
    return {
      id: 'app',
      appName: 'Admin Dashboard',
      defaultGroupId: 'users',
      features: {
        auditLogging: true,
        userRegistration: true,
        aiAssistant: 'disabled',
      },
      updatedAt: new Date(),
      updatedBy: 'system',
    };
  }

  /**
   * Get default settings values for DB insert (without 'id')
   */
  private getDefaultSettingsValues() {
    return {
      appName: 'Admin Dashboard',
      defaultGroupId: 'users',
      features: {
        auditLogging: true,
        userRegistration: true,
        aiAssistant: 'disabled' as const,
      },
      updatedAt: new Date(),
      updatedBy: 'system',
    };
  }

  /**
   * Update the isDefault flag when default group changes
   */
  private async updateDefaultGroup(oldGroupId: string, newGroupId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Remove default from old group
      if (oldGroupId) {
        await tx
          .update(groups)
          .set({ isDefault: false })
          .where(eq(groups.id, oldGroupId));
      }

      // Set default on new group
      await tx
        .update(groups)
        .set({ isDefault: true })
        .where(eq(groups.id, newGroupId));
    });
  }

  /**
   * Check if a feature is enabled
   */
  async isFeatureEnabled(
    feature: keyof AppSettings['features']
  ): Promise<AppSettings['features'][typeof feature]> {
    const settingsData = await this.getSettings();
    return settingsData.features[feature];
  }

  /**
   * Toggle a feature
   */
  async toggleFeature<K extends keyof AppSettings['features']>(
    feature: K,
    enabled: AppSettings['features'][K],
    updaterId: string
  ): Promise<AppSettings> {
    return this.updateSettings(
      {
        features: {
          [feature]: enabled,
        },
      },
      updaterId
    );
  }

  /**
   * Convert a Drizzle row to AppSettings
   */
  private toAppSettings(row: typeof settings.$inferSelect): AppSettings {
    return {
      id: 'app',
      appName: row.appName,
      defaultGroupId: row.defaultGroupId,
      features: row.features as AppSettings['features'],
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }
}
