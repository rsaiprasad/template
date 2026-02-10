import { Hono } from 'hono';
import { describe, expect, it } from 'bun:test';
import type { AppEnv, AuthUser } from '../types/context';
import {
  canModifyUser,
  preventSelfAction,
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
  requireSuperAdmin,
} from './permissions';

/** Create a Hono app that injects a user into context, then applies the middleware */
function createTestApp(middleware: ReturnType<typeof requirePermission>, user: AuthUser | null) {
  const app = new Hono<AppEnv>();
  // Inject user
  app.use('*', async (c, next) => {
    if (user) {
      c.set('user', user);
    }
    await next();
  });
  app.get('/test', middleware, (c) => c.json({ ok: true }));
  return app;
}

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    uid: 'user-1',
    email: 'user@example.com',
    displayName: 'Test User',
    photoURL: null,
    isSuperAdmin: false,
    groupIds: ['users'],
    permissions: [],
    ...overrides,
  };
}

describe('Permission Middleware', () => {
  describe('requirePermission', () => {
    it('should allow super admins without the specific permission', async () => {
      const app = createTestApp(
        requirePermission('users:delete'),
        makeUser({ isSuperAdmin: true })
      );
      const res = await app.request('/test');
      expect(res.status).toBe(200);
    });

    it('should allow users with the required permission', async () => {
      const app = createTestApp(
        requirePermission('users:list'),
        makeUser({ permissions: ['users:list', 'users:read'] })
      );
      const res = await app.request('/test');
      expect(res.status).toBe(200);
    });

    it('should deny users without the required permission', async () => {
      const app = createTestApp(
        requirePermission('users:delete'),
        makeUser({ permissions: ['users:read'] })
      );
      const res = await app.request('/test');
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.message).toContain('users:delete');
    });

    it('should deny when no user is in context', async () => {
      const app = createTestApp(requirePermission('users:read'), null);
      const res = await app.request('/test');
      expect(res.status).toBe(403);
    });
  });

  describe('requireAnyPermission', () => {
    it('should allow when user has at least one matching permission', async () => {
      const app = createTestApp(
        requireAnyPermission(['users:create', 'users:update']),
        makeUser({ permissions: ['users:update'] })
      );
      const res = await app.request('/test');
      expect(res.status).toBe(200);
    });

    it('should deny when user has none of the permissions', async () => {
      const app = createTestApp(
        requireAnyPermission(['users:create', 'users:delete']),
        makeUser({ permissions: ['users:read'] })
      );
      const res = await app.request('/test');
      expect(res.status).toBe(403);
    });

    it('should allow super admins', async () => {
      const app = createTestApp(
        requireAnyPermission(['users:create']),
        makeUser({ isSuperAdmin: true })
      );
      const res = await app.request('/test');
      expect(res.status).toBe(200);
    });
  });

  describe('requireAllPermissions', () => {
    it('should allow when user has all permissions', async () => {
      const app = createTestApp(
        requireAllPermissions(['users:read', 'users:update']),
        makeUser({ permissions: ['users:read', 'users:update', 'users:list'] })
      );
      const res = await app.request('/test');
      expect(res.status).toBe(200);
    });

    it('should deny when user is missing one permission', async () => {
      const app = createTestApp(
        requireAllPermissions(['users:read', 'users:delete']),
        makeUser({ permissions: ['users:read'] })
      );
      const res = await app.request('/test');
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.message).toContain('users:delete');
    });

    it('should allow super admins', async () => {
      const app = createTestApp(
        requireAllPermissions(['users:read', 'users:delete']),
        makeUser({ isSuperAdmin: true })
      );
      const res = await app.request('/test');
      expect(res.status).toBe(200);
    });
  });

  describe('requireSuperAdmin', () => {
    it('should allow super admins', async () => {
      const app = createTestApp(requireSuperAdmin(), makeUser({ isSuperAdmin: true }));
      const res = await app.request('/test');
      expect(res.status).toBe(200);
    });

    it('should deny non-super admins', async () => {
      const app = createTestApp(requireSuperAdmin(), makeUser({ isSuperAdmin: false }));
      const res = await app.request('/test');
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.message).toContain('super administrator');
    });

    it('should deny when no user in context', async () => {
      const app = createTestApp(requireSuperAdmin(), null);
      const res = await app.request('/test');
      expect(res.status).toBe(403);
    });
  });
});

describe('canModifyUser', () => {
  it('should allow non-super-admin to modify non-super-admin', () => {
    const check = canModifyUser('target-1', false);
    const result = check({ uid: 'actor-1', isSuperAdmin: false });
    expect(result.allowed).toBe(true);
  });

  it('should deny non-super-admin from modifying super admin', () => {
    const check = canModifyUser('target-1', true);
    const result = check({ uid: 'actor-1', isSuperAdmin: false });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('super administrator');
  });

  it('should allow super admin to modify super admin', () => {
    const check = canModifyUser('target-1', true);
    const result = check({ uid: 'actor-1', isSuperAdmin: true });
    expect(result.allowed).toBe(true);
  });
});

describe('preventSelfAction', () => {
  it('should deny action on self', () => {
    const result = preventSelfAction('user-1', 'user-1', 'delete');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('delete yourself');
  });

  it('should allow action on different user', () => {
    const result = preventSelfAction('user-1', 'user-2', 'delete');
    expect(result.allowed).toBe(true);
  });
});
