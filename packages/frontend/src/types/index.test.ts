import { describe, expect, it } from 'bun:test';
import { queryKeys } from './index';

describe('queryKeys', () => {
  describe('users', () => {
    it('has correct all key', () => {
      expect(queryKeys.users.all).toEqual(['users']);
    });

    it('creates list key with params', () => {
      expect(queryKeys.users.list({ page: 1 })).toEqual(['users', 'list', { page: 1 }]);
    });

    it('creates detail key with id', () => {
      expect(queryKeys.users.detail('user-123')).toEqual(['users', 'detail', 'user-123']);
    });
  });

  describe('groups', () => {
    it('has correct all key', () => {
      expect(queryKeys.groups.all).toEqual(['groups']);
    });

    it('creates list key with params', () => {
      expect(queryKeys.groups.list({ search: 'test' })).toEqual([
        'groups',
        'list',
        { search: 'test' },
      ]);
    });

    it('creates detail key with id', () => {
      expect(queryKeys.groups.detail('group-1')).toEqual(['groups', 'detail', 'group-1']);
    });
  });

  describe('permissions', () => {
    it('has correct all key', () => {
      expect(queryKeys.permissions.all).toEqual(['permissions']);
    });

    it('creates list key', () => {
      expect(queryKeys.permissions.list()).toEqual(['permissions', 'list']);
    });
  });

  describe('auditLogs', () => {
    it('has correct all key', () => {
      expect(queryKeys.auditLogs.all).toEqual(['auditLogs']);
    });

    it('creates list key with params', () => {
      expect(queryKeys.auditLogs.list({ action: 'create' })).toEqual([
        'auditLogs',
        'list',
        { action: 'create' },
      ]);
    });
  });

  it('has currentUser key', () => {
    expect(queryKeys.currentUser).toEqual(['currentUser']);
  });
});
