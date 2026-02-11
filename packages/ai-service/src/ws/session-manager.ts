import type { Content } from '@google/generative-ai';
import type { WSContext } from 'hono/ws';

export interface Session {
  userId: string;
  email: string;
  displayName: string;
  permissions: string[];
  isSuperAdmin: boolean;
  idToken: string;
  mode: 'voice' | 'chat';
  history: Content[];
  createdAt: number;
  lastActivity: number;
  messageCount: number;
  abortController: AbortController | null;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour

const sessions = new Map<WSContext, Session>();
const rateLimits = new Map<string, RateLimitEntry>();

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  permissions: string[];
  isSuperAdmin: boolean;
  idToken: string;
}

export function createSession(ws: WSContext, userData: UserData): Session {
  const session: Session = {
    userId: userData.uid,
    email: userData.email,
    displayName: userData.displayName,
    permissions: userData.permissions,
    isSuperAdmin: userData.isSuperAdmin,
    idToken: userData.idToken,
    mode: 'chat',
    history: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
    messageCount: 0,
    abortController: null,
  };
  sessions.set(ws, session);
  return session;
}

export function getSession(ws: WSContext): Session | undefined {
  const session = sessions.get(ws);
  if (!session) return undefined;

  // Check max session duration
  if (Date.now() - session.createdAt > MAX_SESSION_DURATION_MS) {
    destroySession(ws);
    return undefined;
  }

  return session;
}

export function destroySession(ws: WSContext): void {
  const session = sessions.get(ws);
  if (session?.abortController) {
    session.abortController.abort();
  }
  sessions.delete(ws);
}

export function checkRateLimit(session: Session): boolean {
  const now = Date.now();
  const entry = rateLimits.get(session.userId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(session.userId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}
