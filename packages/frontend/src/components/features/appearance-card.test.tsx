import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { AppearanceCard } from './appearance-card';

describe('AppearanceCard', () => {
  it('renders without crashing', () => {
    render(<AppearanceCard theme="light" onThemeChange={() => {}} />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });
});
