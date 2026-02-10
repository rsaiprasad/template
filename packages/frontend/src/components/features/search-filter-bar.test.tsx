import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { SearchFilterBar } from './search-filter-bar';

describe('SearchFilterBar', () => {
  it('renders input with placeholder', () => {
    render(<SearchFilterBar placeholder="Search users..." value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(<SearchFilterBar placeholder="Search..." value="test query" onChange={() => {}} />);
    expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
  });

  it('calls onChange when input changes', () => {
    const handleChange = mock(() => {});
    render(<SearchFilterBar placeholder="Search..." value="" onChange={handleChange} />);
    fireEvent.change(screen.getByPlaceholderText('Search...'), {
      target: { value: 'new value' },
    });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders children when provided', () => {
    render(
      <SearchFilterBar placeholder="Search..." value="" onChange={() => {}}>
        <button type="button">Filter</button>
      </SearchFilterBar>
    );
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });
});
