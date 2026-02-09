import type { User } from '@admin-dashboard/shared';
import type { Context } from 'hono';

/**
 * Authenticated user information attached to the request context
 */
export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  isSuperAdmin: boolean;
  groupIds: string[];
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
