import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createChainMock, resetDbMocks } from '../__tests__/setup';
import { NotFoundError } from '../core/errors';

// Must declare vi.mock in the same file that imports the module (Bun requirement)
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { db } from '../db';
import { SettingsService } from './settings.service';

const mockDb = db as any;

function makeSettingsRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'app',
    appName: 'Admin Dashboard',
    defaultGroupId: 'users',
    features: {
      auditLogging: true,
      userRegistration: true,
      aiAssistant: 'disabled',
    },
    updatedAt: new Date('2024-01-01'),
    updatedBy: 'system',
    ...overrides,
  };
}

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks(mockDb);
    service = new SettingsService();
  });

  describe('getSettings', () => {
    it('should return settings when row exists', async () => {
      const row = makeSettingsRow();
      mockDb.select.mockReturnValue(createChainMock([row]));

      const settings = await service.getSettings();
      expect(settings.appName).toBe('Admin Dashboard');
      expect(settings.features.auditLogging).toBe(true);
    });

    it('should return default settings when row does not exist', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      const settings = await service.getSettings();
      expect(settings.appName).toBe('Admin Dashboard');
      expect(settings.defaultGroupId).toBe('users');
    });
  });

  describe('updateSettings', () => {
    it('should update appName', async () => {
      const existingRow = makeSettingsRow();
      const updatedRow = makeSettingsRow({ appName: 'New Name' });

      // First call: getSettings -> select returns existing row
      // Second call: upsert insert returns updated row
      mockDb.select.mockReturnValue(createChainMock([existingRow]));
      mockDb.insert.mockReturnValue(createChainMock([updatedRow]));

      const settings = await service.updateSettings({ appName: 'New Name' }, 'updater-1');
      expect(settings.appName).toBe('New Name');
    });

    it('should throw NotFoundError when updating defaultGroupId to nonexistent group', async () => {
      const existingRow = makeSettingsRow();

      // getSettings returns existing settings
      // group lookup returns empty (group not found)
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // getSettings query
          return createChainMock([existingRow]);
        }
        // group existence check query - returns empty
        return createChainMock([]);
      });

      await expect(
        service.updateSettings({ defaultGroupId: 'bad-group' }, 'updater')
      ).rejects.toThrow(NotFoundError);
    });

    it('should update features with merge', async () => {
      const existingRow = makeSettingsRow();
      const updatedRow = makeSettingsRow({
        features: {
          auditLogging: false,
          userRegistration: true,
          aiAssistant: 'disabled',
        },
      });

      mockDb.select.mockReturnValue(createChainMock([existingRow]));
      mockDb.insert.mockReturnValue(createChainMock([updatedRow]));

      const settings = await service.updateSettings(
        { features: { auditLogging: false } },
        'updater-1'
      );
      expect(settings.features.auditLogging).toBe(false);
      expect(settings.features.userRegistration).toBe(true);
    });
  });

  describe('initializeSettings', () => {
    it('should return existing settings when row exists', async () => {
      const row = makeSettingsRow();
      // insert with onConflictDoNothing, then select
      mockDb.insert.mockReturnValue(createChainMock([]));
      mockDb.select.mockReturnValue(createChainMock([row]));

      const settings = await service.initializeSettings();
      expect(settings.appName).toBe('Admin Dashboard');
    });

    it('should create default settings when row does not exist', async () => {
      // insert succeeds (onConflictDoNothing), then select returns the new row
      mockDb.insert.mockReturnValue(createChainMock([]));

      const defaultRow = makeSettingsRow();
      mockDb.select.mockReturnValue(createChainMock([defaultRow]));

      const settings = await service.initializeSettings();
      expect(settings.appName).toBe('Admin Dashboard');
      expect(settings.defaultGroupId).toBe('users');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled feature', async () => {
      const row = makeSettingsRow();
      mockDb.select.mockReturnValue(createChainMock([row]));

      const enabled = await service.isFeatureEnabled('auditLogging');
      expect(enabled).toBe(true);
    });

    it('should return undefined for missing feature', async () => {
      const row = makeSettingsRow({ features: {} });
      mockDb.select.mockReturnValue(createChainMock([row]));

      const enabled = await service.isFeatureEnabled('auditLogging');
      expect(enabled).toBeUndefined();
    });
  });
});
