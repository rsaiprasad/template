import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MetadataCard } from './metadata-card';

describe('MetadataCard', () => {
  it('renders title', () => {
    render(<MetadataCard title="Details" items={[]} />);
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('renders items with labels and values', () => {
    render(
      <MetadataCard
        title="Details"
        items={[
          { label: 'ID', value: '123' },
          { label: 'Created', value: 'Jan 1, 2024' },
        ]}
      />
    );
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
  });

  it('renders items with icons', () => {
    const MockIcon = ({ className }: { className?: string }) => (
      <svg data-testid="mock-icon" className={className} />
    );
    render(
      <MetadataCard
        title="Details"
        items={[{ icon: MockIcon, label: 'Status', value: 'Active' }]}
      />
    );
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('applies mono styling when mono is true', () => {
    render(
      <MetadataCard title="Details" items={[{ label: 'ID', value: 'abc-123', mono: true }]} />
    );
    const valueEl = screen.getByText('abc-123');
    expect(valueEl.className).toContain('font-mono');
  });
});
