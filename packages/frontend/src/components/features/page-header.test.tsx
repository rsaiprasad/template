import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Users" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Users');
  });

  it('renders description when provided', () => {
    render(<PageHeader title="Users" description="Manage all users" />);
    expect(screen.getByText('Manage all users')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<PageHeader title="Users" />);
    expect(container.querySelector('p')).toBeNull();
  });
});
