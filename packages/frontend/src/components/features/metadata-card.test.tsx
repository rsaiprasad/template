import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MetadataCard } from './metadata-card';

describe('MetadataCard', () => {
  it('renders without crashing', () => {
    render(
      <MetadataCard
        title="Details"
        items={[
          { label: 'ID', value: '123' },
          { label: 'Created', value: 'Jan 1, 2024' },
        ]}
      />
    );
    expect(screen.getByText('Details')).toBeInTheDocument();
  });
});
