import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { mockDocSnapshot } from '../__tests__/setup';
import { NotFoundError } from '../core/errors';
import { getDb } from '../core/lib/firebase-admin';
import { SettingsService } from './settings.service';

const mockDb = getDb() as any;

function makeSettingsData(overrides: Record<string, unknown> = {}) {
  return {
    appName: 'Admin Dashboard',
    defaultGroupId: 'users',
    features: {
      auditLogging: true,
      userRegistration: true,
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
    service = new SettingsService();
  });

  describe('getSettings', () => {
    it('should return settings when doc exists', async () => {
      const data = makeSettingsData();
      const docSnap = mockDocSnapshot('app', data);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      const settings = await service.getSettings();
      expect(settings.appName).toBe('Admin Dashboard');
      expect(settings.features.auditLogging).toBe(true);
    });

    it('should return default settings when doc does not exist', async () => {
      const docSnap = mockDocSnapshot('app', null, false);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      const settings = await service.getSettings();
      expect(settings.appName).toBe('Admin Dashboard');
      expect(settings.defaultGroupId).toBe('users');
    });
  });

  describe('updateSettings', () => {
    it('should update appName', async () => {
      const data = makeSettingsData();
      const docSnap = mockDocSnapshot('app', data);
      const updatedData = { ...data, appName: 'New Name' };
      const updatedDocSnap = mockDocSnapshot('app', updatedData);

      const mockDocRef = {
        get: vi.fn().mockResolvedValueOnce(docSnap).mockResolvedValueOnce(updatedDocSnap),
        update: vi.fn().mockResolvedValue(undefined),
        set: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const settings = await service.updateSettings({ appName: 'New Name' }, 'updater-1');
      expect(settings.appName).toBe('New Name');
    });

    it('should throw NotFoundError when updating defaultGroupId to nonexistent group', async () => {
      const data = makeSettingsData();
      const docSnap = mockDocSnapshot('app', data);
      const missingGroup = mockDocSnapshot('bad-group', null, false);

      mockDb.collection = vi.fn().mockImplementation((name: string) => {
        if (name === 'groups') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(missingGroup),
            }),
          };
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(docSnap),
            update: vi.fn(),
          }),
        };
      });

      await expect(
        service.updateSettings({ defaultGroupId: 'bad-group' }, 'updater')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('initializeSettings', () => {
    it('should return existing settings when doc exists', async () => {
      const data = makeSettingsData();
      const docSnap = mockDocSnapshot('app', data);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      const settings = await service.initializeSettings();
      expect(settings.appName).toBe('Admin Dashboard');
    });

    it('should create default settings when doc does not exist', async () => {
      const docSnap = mockDocSnapshot('app', null, false);
      const mockDocRef = {
        get: vi.fn().mockResolvedValue(docSnap),
        set: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const settings = await service.initializeSettings();
      expect(settings.appName).toBe('Admin Dashboard');
      expect(mockDocRef.set).toHaveBeenCalled();
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled feature', async () => {
      const data = makeSettingsData();
      const docSnap = mockDocSnapshot('app', data);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      const enabled = await service.isFeatureEnabled('auditLogging');
      expect(enabled).toBe(true);
    });

    it('should return false for missing feature', async () => {
      const data = makeSettingsData({ features: {} });
      const docSnap = mockDocSnapshot('app', data);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      const enabled = await service.isFeatureEnabled('auditLogging');
      expect(enabled).toBe(false);
    });
  });
});
