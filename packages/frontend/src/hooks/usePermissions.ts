import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  useAuthStore,
} from '@/stores/auth-store';
import { useCallback, useMemo } from 'react';

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
  const isSuperAdmin = authState.user?.isSuperAdmin ?? false;

  // Memoize permission checks to avoid recalculating on every render
  const checkPermission = useCallback(
    (permission: string) => {
      // Super admins bypass all permission checks
      if (isSuperAdmin) return true;
      return hasPermission(authState, permission);
    },
    [authState, isSuperAdmin]
  );

  const checkAnyPermission = useCallback(
    (perms: string[]) => {
      // Super admins bypass all permission checks
      if (isSuperAdmin) return true;
      return hasAnyPermission(authState, perms);
    },
    [authState, isSuperAdmin]
  );

  const checkAllPermissions = useCallback(
    (perms: string[]) => {
      // Super admins bypass all permission checks
      if (isSuperAdmin) return true;
      return hasAllPermissions(authState, perms);
    },
    [authState, isSuperAdmin]
  );

  // Common permission checks - super admins are always considered admins
  const isAdmin = useMemo(
    () => isSuperAdmin || checkPermission('admin:*') || checkPermission('*'),
    [isSuperAdmin, checkPermission]
  );

  const canManageUsers = useMemo(
    () =>
      isAdmin ||
      checkAnyPermission([
        'users:list',
        'users:read',
        'users:create',
        'users:update',
        'users:delete',
        'users:*',
      ]),
    [isAdmin, checkAnyPermission]
  );

  const canManageGroups = useMemo(
    () =>
      isAdmin ||
      checkAnyPermission([
        'groups:list',
        'groups:read',
        'groups:create',
        'groups:update',
        'groups:delete',
        'groups:*',
      ]),
    [isAdmin, checkAnyPermission]
  );

  const canViewAuditLogs = useMemo(
    () => isAdmin || checkAnyPermission(['audit:read', 'audit:*']),
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
