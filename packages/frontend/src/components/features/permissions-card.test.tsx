import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { PermissionsCard } from './permissions-card';

describe('PermissionsCard', () => {
  it('renders title', () => {
    render(<PermissionsCard permissions={[]} />);
    expect(screen.getByText('Permissions')).toBeInTheDocument();
  });

  it('renders permission badges', () => {
    render(<PermissionsCard permissions={['users:read', 'groups:list']} />);
    expect(screen.getByText('users:read')).toBeInTheDocument();
    expect(screen.getByText('groups:list')).toBeInTheDocument();
  });

  it('renders Super Admin badge when isSuperAdmin', () => {
    render(<PermissionsCard permissions={[]} isSuperAdmin={true} />);
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });

  it('renders empty state when no permissions and not super admin', () => {
    render(<PermissionsCard permissions={[]} />);
    expect(screen.getByText('No specific permissions assigned')).toBeInTheDocument();
  });

  it('shows Super Admin badge instead of permissions when isSuperAdmin', () => {
    render(<PermissionsCard permissions={['users:read']} isSuperAdmin={true} />);
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.queryByText('users:read')).toBeNull();
  });
});
