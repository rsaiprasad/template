import { useMemo, useCallback } from 'react';
import { useAuthStore, hasPermission, hasAnyPermission, hasAllPermissions } from '@/stores/auth-store';

interface UsePermissionsReturn {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isAdmin: boolean;
  canManageUsers: boolean;
  canManageGroups: boolean;
  canViewAuditLogs: boolean;
}

/**
 * Hook for checking user permissions
 */
export function usePermissions(): UsePermissionsReturn {
  const authState = useAuthStore();
  const permissions = authState.user?.permissions ?? [];

  // Memoize permission checks to avoid recalculating on every render
  const checkPermission = useCallback(
    (permission: string) => hasPermission(authState, permission),
    [authState]
  );

  const checkAnyPermission = useCallback(
    (perms: string[]) => hasAnyPermission(authState, perms),
    [authState]
  );

  const checkAllPermissions = useCallback(
    (perms: string[]) => hasAllPermissions(authState, perms),
    [authState]
  );

  // Common permission checks
  const isAdmin = useMemo(
    () => checkPermission('admin:*') || checkPermission('*'),
    [checkPermission]
  );

  const canManageUsers = useMemo(
    () =>
      isAdmin ||
      checkAnyPermission([
        'users:read',
        'users:write',
        'users:delete',
        'users:*',
      ]),
    [isAdmin, checkAnyPermission]
  );

  const canManageGroups = useMemo(
    () =>
      isAdmin ||
      checkAnyPermission([
        'groups:read',
        'groups:write',
        'groups:delete',
        'groups:*',
      ]),
    [isAdmin, checkAnyPermission]
  );

  const canViewAuditLogs = useMemo(
    () =>
      isAdmin ||
      checkAnyPermission(['audit:read', 'audit:*']),
    [isAdmin, checkAnyPermission]
  );

  return {
    permissions,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    isAdmin,
    canManageUsers,
    canManageGroups,
    canViewAuditLogs,
  };
}

/**
 * Hook to require specific permissions
 * Returns true if user has required permissions, false otherwise
 */
export function useRequirePermission(permission: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

/**
 * Hook to require any of the specified permissions
 */
export function useRequireAnyPermission(permissions: string[]): boolean {
  const { hasAnyPermission } = usePermissions();
  return hasAnyPermission(permissions);
}

/**
 * Hook to require all of the specified permissions
 */
export function useRequireAllPermissions(permissions: string[]): boolean {
  const { hasAllPermissions } = usePermissions();
  return hasAllPermissions(permissions);
}

export default usePermissions;
