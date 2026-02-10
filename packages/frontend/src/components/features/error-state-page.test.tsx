import { describe, expect, it } from 'bun:test';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import { ErrorStatePage } from './error-state-page';

const MockIcon = ({ className }: { className?: string }) => (
  <svg data-testid="error-icon" className={className} />
);

describe('ErrorStatePage', () => {
  it('renders error code', () => {
    renderWithProviders(
      <ErrorStatePage code="404" icon={MockIcon} title="Not Found" description="Page not found" />
    );
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders title and description', () => {
    renderWithProviders(
      <ErrorStatePage
        code="403"
        icon={MockIcon}
        title="Access Denied"
        description="You do not have permission"
      />
    );
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('You do not have permission')).toBeInTheDocument();
  });

  it('renders icon', () => {
    renderWithProviders(
      <ErrorStatePage code="404" icon={MockIcon} title="Not Found" description="Page not found" />
    );
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    renderWithProviders(
      <ErrorStatePage
        code="403"
        icon={MockIcon}
        title="Access Denied"
        description="You do not have permission"
      >
        <p>Contact admin</p>
      </ErrorStatePage>
    );
    expect(screen.getByText('Contact admin')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    renderWithProviders(
      <ErrorStatePage
        code="500"
        icon={MockIcon}
        title="Error"
        description="Something went wrong"
        footer={<p>Error ID: abc-123</p>}
      />
    );
    expect(screen.getByText('Error ID: abc-123')).toBeInTheDocument();
  });

  it('renders Go Back and Go to Dashboard buttons', () => {
    renderWithProviders(
      <ErrorStatePage code="404" icon={MockIcon} title="Not Found" description="Page not found" />
    );
    expect(screen.getByText('Go Back')).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });
});
