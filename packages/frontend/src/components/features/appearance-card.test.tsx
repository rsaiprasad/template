import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppearanceCard } from './appearance-card';

describe('AppearanceCard', () => {
  it('renders title', () => {
    render(<AppearanceCard theme="light" onThemeChange={() => {}} />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('renders three theme buttons', () => {
    render(<AppearanceCard theme="light" onThemeChange={() => {}} />);
    expect(screen.getByText('light')).toBeInTheDocument();
    expect(screen.getByText('dark')).toBeInTheDocument();
    expect(screen.getByText('system')).toBeInTheDocument();
  });

  it('calls onThemeChange when a theme button is clicked', () => {
    const handleChange = mock(() => {});
    render(<AppearanceCard theme="light" onThemeChange={handleChange} />);
    fireEvent.click(screen.getByText('dark'));
    expect(handleChange).toHaveBeenCalledWith('dark');
  });

  it('renders description text', () => {
    render(<AppearanceCard theme="light" onThemeChange={() => {}} />);
    expect(
      screen.getByText('Select your preferred theme or use system settings')
    ).toBeInTheDocument();
  });
});
