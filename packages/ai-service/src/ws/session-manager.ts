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

// Key sessions by the underlying raw WebSocket (stable across events),
// NOT by the WSContext wrapper (Hono creates a new one per event).
// biome-ignore lint/suspicious/noExplicitAny: raw ws type varies by runtime
const sessions = new Map<any, Session>();
const rateLimits = new Map<string, RateLimitEntry>();

// biome-ignore lint/suspicious/noExplicitAny: raw ws type varies by runtime
function wsKey(ws: WSContext): any {
  return ws.raw;
}

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
  sessions.set(wsKey(ws), session);
  return session;
}

export function getSession(ws: WSContext): Session | undefined {
  const session = sessions.get(wsKey(ws));
  if (!session) return undefined;

  // Check max session duration
  if (Date.now() - session.createdAt > MAX_SESSION_DURATION_MS) {
    destroySession(ws);
    return undefined;
  }

  return session;
}

export function destroySession(ws: WSContext): void {
  const key = wsKey(ws);
  const session = sessions.get(key);
  if (session?.abortController) {
    session.abortController.abort();
  }
  sessions.delete(key);
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
