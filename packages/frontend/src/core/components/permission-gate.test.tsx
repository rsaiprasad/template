import { beforeEach, describe, expect, it } from 'bun:test';
import { useAuthStore } from '@/stores/auth-store';
import { renderWithProviders } from '@/test/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PermissionGate, RequireAuth, WithPermission } from './permission-gate';

describe('PermissionGate', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        uid: 'u1',
        email: 'test@example.com',
        displayName: 'Test',
        photoURL: null,
        firstName: 'Test',
        lastName: 'User',
        permissions: ['users:read', 'users:list'],
        isSuperAdmin: false,
      },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  });

  it('renders children when user has permission', () => {
    renderWithProviders(
      <PermissionGate permission="users:read">
        <div>Protected Content</div>
      </PermissionGate>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders fallback when user lacks permission', () => {
    renderWithProviders(
      <PermissionGate permission="admin:*" fallback={<div>No Access</div>}>
        <div>Protected Content</div>
      </PermissionGate>
    );
    expect(screen.queryByText('Protected Content')).toBeNull();
    expect(screen.getByText('No Access')).toBeInTheDocument();
  });

  it('renders children when no permissions required', () => {
    renderWithProviders(
      <PermissionGate>
        <div>Open Content</div>
      </PermissionGate>
    );
    expect(screen.getByText('Open Content')).toBeInTheDocument();
  });

  it('renders children for super admin regardless of permission', () => {
    useAuthStore.setState({
      user: {
        uid: 'u1',
        email: 'admin@example.com',
        displayName: 'Admin',
        photoURL: null,
        firstName: 'Admin',
        lastName: 'User',
        permissions: [],
        isSuperAdmin: true,
      },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });

    renderWithProviders(
      <PermissionGate permission="any:permission">
        <div>Admin Content</div>
      </PermissionGate>
    );
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('requires all permissions when requireAll is true', () => {
    renderWithProviders(
      <PermissionGate
        permissions={['users:read', 'admin:*']}
        requireAll={true}
        fallback={<div>No Access</div>}
      >
        <div>Protected</div>
      </PermissionGate>
    );
    expect(screen.queryByText('Protected')).toBeNull();
    expect(screen.getByText('No Access')).toBeInTheDocument();
  });

  it('requires any permission when requireAll is false (default)', () => {
    renderWithProviders(
      <PermissionGate permissions={['users:read', 'admin:*']} fallback={<div>No Access</div>}>
        <div>Protected</div>
      </PermissionGate>
    );
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });
});

describe('WithPermission', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        uid: 'u1',
        email: 'test@example.com',
        displayName: 'Test',
        photoURL: null,
        firstName: 'Test',
        lastName: 'User',
        permissions: ['users:read'],
        isSuperAdmin: false,
      },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  });

  it('renders children when user has permission', () => {
    renderWithProviders(
      <WithPermission permission="users:read">
        <button type="button">Action</button>
      </WithPermission>
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('renders fallback when user lacks permission', () => {
    renderWithProviders(
      <WithPermission permission="admin:*" fallback={<span>Hidden</span>}>
        <button type="button">Action</button>
      </WithPermission>
    );
    expect(screen.queryByText('Action')).toBeNull();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('renders nothing (default fallback) when user lacks permission', () => {
    renderWithProviders(
      <WithPermission permission="admin:*">
        <button type="button">Action</button>
      </WithPermission>
    );
    expect(screen.queryByText('Action')).toBeNull();
  });
});

describe('RequireAuth', () => {
  it('renders children when authenticated and initialized', () => {
    useAuthStore.setState({
      user: {
        uid: 'u1',
        email: 'test@example.com',
        displayName: 'Test',
        photoURL: null,
        firstName: 'Test',
        lastName: 'User',
        permissions: [],
        isSuperAdmin: false,
      },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });

    renderWithProviders(
      <RequireAuth>
        <div>Authenticated Content</div>
      </RequireAuth>
    );
    expect(screen.getByText('Authenticated Content')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      error: null,
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <RequireAuth>
                  <div>Authenticated Content</div>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.queryByText('Authenticated Content')).toBeNull();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('shows loading spinner when not initialized', () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      error: null,
    });

    renderWithProviders(
      <RequireAuth>
        <div>Authenticated Content</div>
      </RequireAuth>
    );
    expect(screen.queryByText('Authenticated Content')).toBeNull();
    // Should show spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });
});
