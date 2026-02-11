import type { AppSettings, UpdateSettingsInput } from '@admin-dashboard/shared';
import { NotFoundError } from '../core/errors';
import { Collections, convertFirestoreDoc, getDb } from '../core/lib/firebase-admin';

/**
 * Settings Service
 * Handles application settings
 */
export class SettingsService {
  private db = getDb();
  private readonly SETTINGS_DOC_ID = 'app';

  /**
   * Get application settings
   */
  async getSettings(): Promise<AppSettings> {
    const doc = await this.db.collection(Collections.SETTINGS).doc(this.SETTINGS_DOC_ID).get();

    if (!doc.exists) {
      // Return default settings if not initialized
      return this.getDefaultSettings();
    }

    const settings = convertFirestoreDoc<AppSettings>(doc);
    return settings || this.getDefaultSettings();
  }

  /**
   * Update application settings
   */
  async updateSettings(input: UpdateSettingsInput, updaterId: string): Promise<AppSettings> {
    const settingsRef = this.db.collection(Collections.SETTINGS).doc(this.SETTINGS_DOC_ID);
    const settingsDoc = await settingsRef.get();

    const existingSettings = settingsDoc.exists
      ? convertFirestoreDoc<AppSettings>(settingsDoc)!
      : this.getDefaultSettings();

    const updates: Partial<AppSettings> = {
      updatedAt: new Date(),
      updatedBy: updaterId,
    };

    if (input.appName !== undefined) {
      updates.appName = input.appName;
    }

    if (input.defaultGroupId !== undefined) {
      // Verify the group exists
      const groupDoc = await this.db.collection(Collections.GROUPS).doc(input.defaultGroupId).get();
      if (!groupDoc.exists) {
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

    if (settingsDoc.exists) {
      await settingsRef.update(updates);
    } else {
      // Create settings document if it doesn't exist
      await settingsRef.set({
        ...this.getDefaultSettings(),
        ...updates,
        id: this.SETTINGS_DOC_ID,
      });
    }

    const updatedDoc = await settingsRef.get();
    return convertFirestoreDoc<AppSettings>(updatedDoc)!;
  }

  /**
   * Initialize settings with defaults
   */
  async initializeSettings(): Promise<AppSettings> {
    const settingsRef = this.db.collection(Collections.SETTINGS).doc(this.SETTINGS_DOC_ID);
    const settingsDoc = await settingsRef.get();

    if (settingsDoc.exists) {
      return convertFirestoreDoc<AppSettings>(settingsDoc)!;
    }

    const defaultSettings = this.getDefaultSettings();
    await settingsRef.set(defaultSettings);

    return defaultSettings;
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
   * Update the isDefault flag when default group changes
   */
  private async updateDefaultGroup(oldGroupId: string, newGroupId: string): Promise<void> {
    const batch = this.db.batch();

    // Remove default from old group
    if (oldGroupId) {
      const oldGroupRef = this.db.collection(Collections.GROUPS).doc(oldGroupId);
      batch.update(oldGroupRef, { isDefault: false });
    }

    // Set default on new group
    const newGroupRef = this.db.collection(Collections.GROUPS).doc(newGroupId);
    batch.update(newGroupRef, { isDefault: true });

    await batch.commit();
  }

  /**
   * Check if a feature is enabled
   */
  async isFeatureEnabled(
    feature: keyof AppSettings['features']
  ): Promise<AppSettings['features'][typeof feature]> {
    const settings = await this.getSettings();
    return settings.features[feature];
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
}
