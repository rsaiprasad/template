import { describe, expect, it } from 'bun:test';
import {
  CORE_PERMISSIONS,
  getPermissionDescription,
  getPermissionsByResource,
  getUserPermissions,
} from './permissions';

describe('Core Permissions', () => {
  it('every permission key matches resource:action format', () => {
    for (const [key, def] of Object.entries(CORE_PERMISSIONS)) {
      expect(key).toBe(`${def.resource}:${def.action}`);
      expect(def.description).toBeDefined();
    }
  });

  it('getUserPermissions excludes destructive permissions', () => {
    const user = getUserPermissions();
    expect(user).toContain('users:read');
    expect(user).toContain('users:update');
    expect(user).not.toContain('users:delete');
  });

  it('getPermissionsByResource filters correctly', () => {
    const userPerms = getPermissionsByResource('users');
    expect(userPerms.every((p) => p.startsWith('users:'))).toBe(true);
    expect(getPermissionsByResource('nonexistent')).toEqual([]);
  });

  it('getPermissionDescription falls back to key for unknown permissions', () => {
    expect(getPermissionDescription('users:create')).toBe('Create new users');
    expect(getPermissionDescription('foo:bar')).toBe('foo:bar');
  });
});
