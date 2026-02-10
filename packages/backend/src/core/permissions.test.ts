import { describe, expect, it } from 'bun:test';
import {
  CORE_PERMISSIONS,
  getAdminPermissions,
  getAllPermissions,
  getPermissionDefinitions,
  getPermissionDescription,
  getPermissionsByResource,
  getUserPermissions,
} from './permissions';

describe('Core Permissions', () => {
  describe('CORE_PERMISSIONS', () => {
    it('should contain all user permissions', () => {
      expect(CORE_PERMISSIONS['users:create']).toBeDefined();
      expect(CORE_PERMISSIONS['users:read']).toBeDefined();
      expect(CORE_PERMISSIONS['users:update']).toBeDefined();
      expect(CORE_PERMISSIONS['users:delete']).toBeDefined();
      expect(CORE_PERMISSIONS['users:list']).toBeDefined();
    });

    it('should contain all group permissions', () => {
      expect(CORE_PERMISSIONS['groups:create']).toBeDefined();
      expect(CORE_PERMISSIONS['groups:read']).toBeDefined();
      expect(CORE_PERMISSIONS['groups:update']).toBeDefined();
      expect(CORE_PERMISSIONS['groups:delete']).toBeDefined();
      expect(CORE_PERMISSIONS['groups:list']).toBeDefined();
    });

    it('should contain audit permission', () => {
      expect(CORE_PERMISSIONS['audit:list']).toBeDefined();
    });

    it('should have valid structure for each permission', () => {
      for (const [key, def] of Object.entries(CORE_PERMISSIONS)) {
        expect(def.resource).toBeDefined();
        expect(def.action).toBeDefined();
        expect(def.description).toBeDefined();
        // key format should match resource:action
        expect(key).toBe(`${def.resource}:${def.action}`);
      }
    });
  });

  describe('getAllPermissions', () => {
    it('should return all core permissions', () => {
      const all = getAllPermissions();
      expect(all).toContain('users:create');
      expect(all).toContain('groups:list');
      expect(all).toContain('audit:list');
      expect(all.length).toBeGreaterThanOrEqual(11);
    });
  });

  describe('getPermissionDefinitions', () => {
    it('should return definitions for all permissions', () => {
      const defs = getPermissionDefinitions();
      expect(defs['users:create']?.description).toBe('Create new users');
      expect(defs['groups:update']?.description).toBe('Update group information');
    });
  });

  describe('getAdminPermissions', () => {
    it('should return all permissions', () => {
      const admin = getAdminPermissions();
      const all = getAllPermissions();
      expect(admin).toEqual(all);
    });
  });

  describe('getUserPermissions', () => {
    it('should return minimal permissions', () => {
      const user = getUserPermissions();
      expect(user).toContain('users:read');
      expect(user).toContain('users:update');
      expect(user).not.toContain('users:delete');
    });
  });

  describe('getPermissionsByResource', () => {
    it('should filter by resource prefix', () => {
      const userPerms = getPermissionsByResource('users');
      expect(userPerms.every((p) => p.startsWith('users:'))).toBe(true);
      expect(userPerms.length).toBe(5);
    });

    it('should return empty for unknown resource', () => {
      const perms = getPermissionsByResource('nonexistent');
      expect(perms).toEqual([]);
    });
  });

  describe('getPermissionDescription', () => {
    it('should return description for known permission', () => {
      expect(getPermissionDescription('users:create')).toBe('Create new users');
    });

    it('should return the permission string itself for unknown permission', () => {
      expect(getPermissionDescription('foo:bar')).toBe('foo:bar');
    });
  });
});
