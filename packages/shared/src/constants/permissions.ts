import type { PermissionDefinition } from '../core/types/permission';

/**
 * Custom application permissions.
 * Add your app-specific permissions here. They will be merged with
 * the core template permissions (users, groups, settings, audit).
 *
 * Example:
 *   'posts:create': { resource: 'posts', action: 'create', description: 'Create blog posts' },
 *   'analytics:read': { resource: 'analytics', action: 'read', description: 'View analytics' },
 */
export const CUSTOM_PERMISSIONS: Record<string, PermissionDefinition> = {
  'ai:use': { resource: 'ai', action: 'use', description: 'Use AI assistant' },
};
