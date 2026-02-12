/**
 * Global test setup for backend unit tests.
 * Mocks Firebase Auth Admin SDK so no real Firebase connection is needed.
 *
 * NOTE: Bun's vi.mock only applies to the file that calls it.
 * Database mocks (../db) must be declared in each test file individually.
 * This setup file handles firebase-admin and config mocks which are imported
 * by the service code (not the test files directly).
 */
import { vi } from 'bun:test';

// ---- Firebase Auth Mock ----

const mockAuth = {
  verifyIdToken: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
};

vi.mock('../core/lib/firebase-admin', () => ({
  initializeFirebaseAdmin: vi.fn(),
  getApp: vi.fn(),
  getAuthAdmin: vi.fn(() => mockAuth),
}));

// ---- Mock config ----

vi.mock('../config', () => ({
  config: {
    cors: {
      origins: ['http://localhost:5173'],
      credentials: true,
    },
    rateLimit: {
      windowMs: 60000,
      max: 100,
      authMax: 10,
    },
    audit: {
      maxHistoryDays: 90,
    },
    superAdminEmail: 'admin@example.com',
  },
}));

// ---- Drizzle DB Mock Helpers ----

/**
 * Create a chainable mock that resolves to `resolvedValue` when awaited.
 * Every Drizzle chain method (select, from, where, ...) returns the same
 * chain object so they can be chained freely.  The `.then` property makes
 * the chain thenable so `await` resolves it.
 */
export function createChainMock(resolvedValue: any = []) {
  const chain: any = {};
  const methods = [
    'select',
    'from',
    'where',
    'insert',
    'values',
    'update',
    'set',
    'delete',
    'orderBy',
    'offset',
    'limit',
    'returning',
    'groupBy',
    'innerJoin',
    'onConflictDoNothing',
    'onConflictDoUpdate',
    '$dynamic',
  ];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // Make it thenable so `await chain` resolves to resolvedValue
  chain.then = (resolve: any) => resolve(resolvedValue);
  return chain;
}

/**
 * Reset all db mock methods and re-wire them to a fresh default chain.
 * Pass the mocked `db` import (cast to `any`) from the test file.
 */
export function resetDbMocks(mockDb: any) {
  const fresh = createChainMock();
  mockDb.select.mockReset().mockReturnValue(fresh);
  mockDb.insert.mockReset().mockReturnValue(fresh);
  mockDb.update.mockReset().mockReturnValue(fresh);
  mockDb.delete.mockReset().mockReturnValue(fresh);
  mockDb.transaction.mockReset();
}

// Expose mocks for test files
export { mockAuth };
