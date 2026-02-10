/**
 * Global test setup for backend unit tests.
 * Mocks Firebase Admin SDK modules so no real Firebase connection is needed.
 */
import { vi } from 'bun:test';

// ---- Firestore Mock Helpers ----

/** Create a mock Firestore document snapshot */
export function mockDocSnapshot(
  id: string,
  data: Record<string, unknown> | null,
  exists = true
): FirestoreDocSnapshot {
  return {
    id,
    exists,
    data: () => (exists ? data : undefined),
    ref: { id, update: vi.fn(), delete: vi.fn() },
  } as unknown as FirestoreDocSnapshot;
}

/** Create a mock Firestore query snapshot */
export function mockQuerySnapshot(docs: FirestoreDocSnapshot[]): FirestoreQuerySnapshot {
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
  } as unknown as FirestoreQuerySnapshot;
}

type FirestoreDocSnapshot = FirebaseFirestore.DocumentSnapshot;
type FirestoreQuerySnapshot = FirebaseFirestore.QuerySnapshot;

// ---- Firestore Mock Chain Builder ----

export function createMockDb() {
  const mockBatch = {
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  const mockTransaction = {
    get: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  // Each query builder method returns itself to allow chaining
  const createQueryChain = (): Record<string, ReturnType<typeof vi.fn>> => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.where = vi.fn().mockReturnValue(chain);
    chain.orderBy = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.offset = vi.fn().mockReturnValue(chain);
    chain.startAfter = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.count = vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
    });
    chain.get = vi.fn().mockResolvedValue(mockQuerySnapshot([]));
    chain.doc = vi.fn().mockReturnValue({
      id: 'mock-id',
      get: vi.fn().mockResolvedValue(mockDocSnapshot('mock-id', null, false)),
      set: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    });
    return chain;
  };

  const mockCollection = vi.fn().mockImplementation(() => createQueryChain());

  const mockDb = {
    collection: mockCollection,
    batch: vi.fn().mockReturnValue(mockBatch),
    runTransaction: vi
      .fn()
      .mockImplementation(async (fn: (t: typeof mockTransaction) => Promise<unknown>) => {
        return fn(mockTransaction);
      }),
  };

  return { mockDb, mockBatch, mockTransaction, mockCollection };
}

// ---- Firebase Admin Mock ----

const { mockDb } = createMockDb();
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
  getDb: vi.fn(() => mockDb),
  Collections: {
    USERS: 'users',
    GROUPS: 'groups',
    AUDIT_LOGS: 'auditLogs',
    SETTINGS: 'settings',
  },
  toFirestoreTimestamp: vi.fn((d: Date) => ({ toDate: () => d })),
  fromFirestoreTimestamp: vi.fn((t: { toDate: () => Date } | null) => (t ? t.toDate() : undefined)),
  convertFirestoreDoc: vi.fn((doc: FirestoreDocSnapshot) => {
    if (!doc.exists) return null;
    const data = doc.data() as Record<string, unknown>;
    return { id: doc.id, ...data };
  }),
  convertFirestoreDocs: vi.fn((snapshot: FirestoreQuerySnapshot) => {
    return snapshot.docs
      .filter((d: FirestoreDocSnapshot) => d.exists)
      .map((d: FirestoreDocSnapshot) => {
        const data = d.data() as Record<string, unknown>;
        return { id: d.id, ...data };
      });
  }),
}));

// Mock config
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

// Expose mocks for test files to import
export { mockAuth, mockDb };
