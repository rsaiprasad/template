import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createChainMock, resetDbMocks } from '../__tests__/setup';

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
import { AuditService } from './audit.service';

const mockDb = db as any;

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks(mockDb);
    service = new AuditService();
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry', async () => {
      const now = new Date();
      const insertedRow = {
        id: 'log-1',
        timestamp: now,
        actorId: 'user-1',
        actorEmail: 'user@example.com',
        actorName: 'Test User',
        action: 'USER_CREATED',
        resource: 'users',
        resourceId: 'user-2',
        description: 'Created user user-2',
        changes: null,
        ipAddress: null,
        userAgent: null,
      };

      mockDb.insert.mockReturnValue(createChainMock([insertedRow]));

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
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should include optional fields when provided', async () => {
      const now = new Date();
      const insertedRow = {
        id: 'log-2',
        timestamp: now,
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
      };

      mockDb.insert.mockReturnValue(createChainMock([insertedRow]));

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
      const logRow = {
        id: 'log-1',
        timestamp: new Date(),
        actorId: 'user-1',
        actorEmail: 'user@example.com',
        actorName: 'Test User',
        action: 'LOGIN',
        resource: 'auth',
        resourceId: 'user-1',
        description: 'User logged in',
        changes: null,
        ipAddress: null,
        userAgent: null,
      };

      mockDb.select.mockReturnValue(createChainMock([logRow]));

      const log = await service.getAuditLog('log-1');
      expect(log).toBeTruthy();
      expect(log?.action).toBe('LOGIN');
    });

    it('should return null when not found', async () => {
      mockDb.select.mockReturnValue(createChainMock([]));

      const log = await service.getAuditLog('log-1');
      expect(log).toBeNull();
    });
  });

  describe('listAuditLogs', () => {
    it('should return logs with pagination', async () => {
      const logRow = {
        id: 'log-1',
        timestamp: new Date(),
        actorId: 'user-1',
        actorEmail: 'user@example.com',
        actorName: 'User',
        action: 'LOGIN',
        resource: 'auth',
        resourceId: 'user-1',
        description: 'Logged in',
        changes: null,
        ipAddress: null,
        userAgent: null,
      };

      // First call: count query returns [{count: 1}]
      // Second call: data query returns [logRow]
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock([{ count: 1 }]);
        }
        return createChainMock([logRow]);
      });

      const result = await service.listAuditLogs({ page: 1, limit: 50 });
      expect(result.total).toBe(1);
      expect(result.logs.length).toBe(1);
    });

    it('should return empty when no logs match', async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock([{ count: 0 }]);
        }
        return createChainMock([]);
      });

      const result = await service.listAuditLogs({
        action: 'LOGIN',
        resource: 'auth',
        actorId: 'user-1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(result.total).toBe(0);
      expect(result.logs.length).toBe(0);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old logs and return count', async () => {
      const deletedRows = [{ id: 'log-1' }, { id: 'log-2' }];
      mockDb.delete.mockReturnValue(createChainMock(deletedRows));

      const count = await service.cleanupOldLogs(90);
      expect(count).toBe(2);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should return 0 when no old logs', async () => {
      mockDb.delete.mockReturnValue(createChainMock([]));

      const count = await service.cleanupOldLogs(90);
      expect(count).toBe(0);
    });
  });

  describe('getAuditStats', () => {
    it('should return aggregated stats', async () => {
      const breakdownRows = [
        { action: 'LOGIN', resource: 'auth' },
        { action: 'LOGIN', resource: 'auth' },
        { action: 'USER_CREATED', resource: 'users' },
      ];

      // First call: count query
      // Second call: breakdown query
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock([{ count: 3 }]);
        }
        return createChainMock(breakdownRows);
      });

      const stats = await service.getAuditStats();
      expect(stats.totalLogs).toBe(3);
      expect(stats.byAction.LOGIN).toBe(2);
      expect(stats.byAction.USER_CREATED).toBe(1);
      expect(stats.byResource.auth).toBe(2);
      expect(stats.byResource.users).toBe(1);
    });
  });
});
