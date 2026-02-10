import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { SearchFilterBar } from './search-filter-bar';

describe('SearchFilterBar', () => {
  it('renders without crashing', () => {
    render(<SearchFilterBar placeholder="Search users..." value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });
});
