import { beforeEach, describe, expect, it } from 'bun:test';
import { useAuthStore } from '@/stores/auth-store';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import { ListHeader } from './list-header';

describe('ListHeader', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        uid: 'u1',
        email: 'test@example.com',
        displayName: 'Test',
        photoURL: null,
        firstName: 'Test',
        lastName: 'User',
        permissions: ['users:create'],
        isSuperAdmin: false,
      },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  });

  it('renders title and description', () => {
    renderWithProviders(
      <ListHeader
        title="Users"
        description="Manage users"
        permission="users:create"
        buttonLabel="Add User"
        buttonHref="/users/new"
      />
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Users');
    expect(screen.getByText('Manage users')).toBeInTheDocument();
  });

  it('renders button when user has permission', () => {
    renderWithProviders(
      <ListHeader
        title="Users"
        description="Manage users"
        permission="users:create"
        buttonLabel="Add User"
        buttonHref="/users/new"
      />
    );
    expect(screen.getByText('Add User')).toBeInTheDocument();
  });

  it('hides button when user lacks permission', () => {
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
      <ListHeader
        title="Users"
        description="Manage users"
        permission="users:create"
        buttonLabel="Add User"
        buttonHref="/users/new"
      />
    );
    expect(screen.queryByText('Add User')).toBeNull();
  });
});
