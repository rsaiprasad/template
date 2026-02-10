import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('renders without crashing', () => {
    render(<PageHeader title="Users" description="Manage all users" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Users');
  });
});
