import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { useAuthStore } from '@/stores/auth-store';
import { renderWithProviders } from '@/test/test-utils';
import { fireEvent, screen } from '@testing-library/react';
import { BulkActionBar } from './bulk-action-bar';

describe('BulkActionBar', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        uid: 'u1',
        email: 'test@example.com',
        displayName: 'Test',
        photoURL: null,
        firstName: 'Test',
        lastName: 'User',
        permissions: ['users:delete'],
        isSuperAdmin: false,
      },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  });

  it('renders nothing when selectedCount is 0', () => {
    const { container } = renderWithProviders(
      <BulkActionBar selectedCount={0} permission="users:delete" onDelete={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('calls onDelete when delete button is clicked', () => {
    const handleDelete = mock(() => {});
    renderWithProviders(
      <BulkActionBar selectedCount={1} permission="users:delete" onDelete={handleDelete} />
    );
    fireEvent.click(screen.getByText('Delete Selected'));
    expect(handleDelete).toHaveBeenCalled();
  });

  it('hides delete button when user lacks permission', () => {
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
      <BulkActionBar selectedCount={2} permission="users:delete" onDelete={() => {}} />
    );
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.queryByText('Delete Selected')).toBeNull();
  });
});
