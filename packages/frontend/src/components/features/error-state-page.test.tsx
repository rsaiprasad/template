import { describe, expect, it } from 'bun:test';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import { ErrorStatePage } from './error-state-page';

const MockIcon = ({ className }: { className?: string }) => (
  <svg data-testid="error-icon" className={className} />
);

describe('ErrorStatePage', () => {
  it('renders without crashing', () => {
    renderWithProviders(
      <ErrorStatePage code="404" icon={MockIcon} title="Not Found" description="Page not found" />
    );
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Not Found')).toBeInTheDocument();
  });
});
