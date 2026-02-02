import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/stores/auth-store';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGate({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  redirectTo,
}: PermissionGateProps) {
  const location = useLocation();
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions();

  const allPermissions = permission ? [permission, ...permissions] : permissions;

  // Check if user has required permissions
  const hasAccess = React.useMemo(() => {
    if (allPermissions.length === 0) return true;
    if (isAdmin) return true;

    if (requireAll) {
      return hasAllPermissions(allPermissions);
    }
    return hasAnyPermission(allPermissions);
  }, [allPermissions, isAdmin, requireAll, hasAnyPermission, hasAllPermissions]);

  if (!hasAccess) {
    if (redirectTo) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Component that requires authentication
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  if (!isInitialized) {
    // Show loading while checking auth
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

interface RequirePermissionProps {
  children: React.ReactNode;
  permission: string;
}

/**
 * Component that requires a specific permission
 */
export function RequirePermission({ children, permission }: RequirePermissionProps) {
  return (
    <PermissionGate permission={permission} redirectTo="/forbidden">
      {children}
    </PermissionGate>
  );
}

interface WithPermissionProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Inline component to conditionally render based on permission
 */
export function WithPermission({
  permission,
  children,
  fallback = null,
}: WithPermissionProps) {
  const { hasPermission, isAdmin } = usePermissions();

  if (!isAdmin && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * HOC to wrap components with permission requirements
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string,
  FallbackComponent?: React.ComponentType
) {
  return function WithPermissionWrapper(props: P) {
    return (
      <PermissionGate
        permission={permission}
        fallback={FallbackComponent ? <FallbackComponent /> : null}
      >
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}

export default PermissionGate;
