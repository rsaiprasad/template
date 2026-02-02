import type { Context } from 'hono';
import type { User } from '@admin-dashboard/shared';

/**
 * Authenticated user information attached to the request context
 */
export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  isSuperAdmin: boolean;
  groupId: string;
  permissions: string[];
}

/**
 * Variables stored in the Hono context
 */
export interface AppVariables {
  user: AuthUser;
  userRecord: User;
  requestId: string;
  clientIp: string;
  userAgent: string;
}

/**
 * Extended Hono context with typed variables
 */
export type AppContext = Context<{ Variables: AppVariables }>;

/**
 * Hono environment type for app configuration
 */
export interface AppEnv {
  Variables: AppVariables;
}
