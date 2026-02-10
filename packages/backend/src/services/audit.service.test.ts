import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { mockDocSnapshot, mockQuerySnapshot } from '../__tests__/setup';
import { getDb } from '../core/lib/firebase-admin';
import { AuditService } from './audit.service';

const mockDb = getDb() as any;

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuditService();
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry', async () => {
      const mockDocRef = {
        id: 'log-1',
        set: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const log = await service.createAuditLog({
        actorId: 'user-1',
        actorEmail: 'user@example.com',
        actorName: 'Test User',
        action: 'USER_CREATED',
        resource: 'users',
        resourceId: 'user-2',
        description: 'Created user user-2',
      });

      expect(log.actorId).toBe('user-1');
      expect(log.action).toBe('USER_CREATED');
      expect(log.timestamp).toBeInstanceOf(Date);
      expect(mockDocRef.set).toHaveBeenCalled();
    });

    it('should include optional fields when provided', async () => {
      const mockDocRef = {
        id: 'log-2',
        set: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const log = await service.createAuditLog({
        actorId: 'user-1',
        actorEmail: 'user@example.com',
        actorName: 'Test User',
        action: 'USER_UPDATED',
        resource: 'users',
        resourceId: 'user-2',
        description: 'Updated user',
        changes: { before: { name: 'Old' }, after: { name: 'New' } },
        ipAddress: '1.2.3.4',
        userAgent: 'TestAgent/1.0',
      });

      expect(log.changes).toEqual({ before: { name: 'Old' }, after: { name: 'New' } });
      expect(log.ipAddress).toBe('1.2.3.4');
      expect(log.userAgent).toBe('TestAgent/1.0');
    });
  });

  describe('getAuditLog', () => {
    it('should return log when found', async () => {
      const logData = {
        timestamp: new Date(),
        actorId: 'user-1',
        actorEmail: 'user@example.com',
        actorName: 'Test User',
        action: 'LOGIN',
        resource: 'auth',
        resourceId: 'user-1',
        description: 'User logged in',
      };
      const docSnap = mockDocSnapshot('log-1', logData);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      const log = await service.getAuditLog('log-1');
      expect(log).toBeTruthy();
      expect(log?.action).toBe('LOGIN');
    });

    it('should return null when not found', async () => {
      const docSnap = mockDocSnapshot('log-1', null, false);
      mockDb.collection = vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(docSnap),
        }),
      });

      const log = await service.getAuditLog('log-1');
      expect(log).toBeNull();
    });
  });

  describe('listAuditLogs', () => {
    it('should return logs with pagination', async () => {
      const logData = {
        timestamp: new Date(),
        actorId: 'user-1',
        actorEmail: 'user@example.com',
        actorName: 'User',
        action: 'LOGIN',
        resource: 'auth',
        resourceId: 'user-1',
        description: 'Logged in',
      };
      const logSnap = mockDocSnapshot('log-1', logData);
      const querySnap = mockQuerySnapshot([logSnap]);

      const chain = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ data: () => ({ count: 1 }) }),
        }),
        get: vi.fn().mockResolvedValue(querySnap),
      };
      mockDb.collection = vi.fn().mockReturnValue(chain);

      const result = await service.listAuditLogs({ page: 1, limit: 50 });
      expect(result.total).toBe(1);
      expect(result.logs.length).toBe(1);
    });

    it('should apply filters', async () => {
      const querySnap = mockQuerySnapshot([]);
      const chain = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
        }),
        get: vi.fn().mockResolvedValue(querySnap),
      };
      mockDb.collection = vi.fn().mockReturnValue(chain);

      await service.listAuditLogs({
        action: 'LOGIN',
        resource: 'auth',
        actorId: 'user-1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      // where should have been called for action, resource, actorId, startDate, endDate
      expect(chain.where).toHaveBeenCalledTimes(5);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old logs in batch', async () => {
      const mockRef1 = { id: 'log-1' };
      const mockRef2 = { id: 'log-2' };
      const docs = [{ ref: mockRef1 }, { ref: mockRef2 }];
      const querySnap = { empty: false, docs, size: 2 };

      const chain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(querySnap),
      };
      mockDb.collection = vi.fn().mockReturnValue(chain);

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.batch = vi.fn().mockReturnValue(mockBatch);

      const count = await service.cleanupOldLogs(90);
      expect(count).toBe(2);
      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should return 0 when no old logs', async () => {
      const querySnap = { empty: true, docs: [], size: 0 };
      const chain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(querySnap),
      };
      mockDb.collection = vi.fn().mockReturnValue(chain);

      const count = await service.cleanupOldLogs(90);
      expect(count).toBe(0);
    });
  });

  describe('getAuditStats', () => {
    it('should return aggregated stats', async () => {
      const logs = [
        mockDocSnapshot('l1', { action: 'LOGIN', resource: 'auth', timestamp: new Date() }),
        mockDocSnapshot('l2', { action: 'LOGIN', resource: 'auth', timestamp: new Date() }),
        mockDocSnapshot('l3', { action: 'USER_CREATED', resource: 'users', timestamp: new Date() }),
      ];
      const querySnap = mockQuerySnapshot(logs);

      const chain = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ data: () => ({ count: 3 }) }),
        }),
        get: vi.fn().mockResolvedValue(querySnap),
      };
      mockDb.collection = vi.fn().mockReturnValue(chain);

      const stats = await service.getAuditStats();
      expect(stats.totalLogs).toBe(3);
      expect(stats.byAction.LOGIN).toBe(2);
      expect(stats.byAction.USER_CREATED).toBe(1);
      expect(stats.byResource.auth).toBe(2);
      expect(stats.byResource.users).toBe(1);
    });
  });
});
