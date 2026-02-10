import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { PermissionsCard } from './permissions-card';

describe('PermissionsCard', () => {
  it('renders without crashing', () => {
    render(<PermissionsCard permissions={['users:read', 'groups:list']} />);
    expect(screen.getByText('Permissions')).toBeInTheDocument();
  });
});
