import { beforeEach, describe, expect, it } from 'bun:test';
import { selectIsDark, selectResolvedTheme, selectTheme, useThemeStore } from './theme-store';

describe('useThemeStore', () => {
  beforeEach(() => {
    // Reset store state
    useThemeStore.setState({
      theme: 'system',
      resolvedTheme: 'light',
    });
    // Clear localStorage
    localStorage.removeItem('theme-storage');
  });

  describe('setTheme', () => {
    it('sets theme to light', () => {
      useThemeStore.getState().setTheme('light');
      const state = useThemeStore.getState();
      expect(state.theme).toBe('light');
      expect(state.resolvedTheme).toBe('light');
    });

    it('sets theme to dark', () => {
      useThemeStore.getState().setTheme('dark');
      const state = useThemeStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.resolvedTheme).toBe('dark');
    });

    it('sets theme to system (resolves to light when matchMedia returns false)', () => {
      useThemeStore.getState().setTheme('system');
      const state = useThemeStore.getState();
      expect(state.theme).toBe('system');
      // matchMedia is mocked to return false for prefers-color-scheme: dark
      expect(state.resolvedTheme).toBe('light');
    });
  });

  describe('toggleTheme', () => {
    it('toggles from light to dark', () => {
      useThemeStore.setState({ resolvedTheme: 'light' });
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().theme).toBe('dark');
      expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    });

    it('toggles from dark to light', () => {
      useThemeStore.setState({ resolvedTheme: 'dark' });
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().theme).toBe('light');
      expect(useThemeStore.getState().resolvedTheme).toBe('light');
    });
  });

  describe('selectors', () => {
    it('selectTheme returns current theme', () => {
      useThemeStore.getState().setTheme('dark');
      expect(selectTheme(useThemeStore.getState())).toBe('dark');
    });

    it('selectResolvedTheme returns resolved theme', () => {
      useThemeStore.getState().setTheme('dark');
      expect(selectResolvedTheme(useThemeStore.getState())).toBe('dark');
    });

    it('selectIsDark returns true when dark', () => {
      useThemeStore.getState().setTheme('dark');
      expect(selectIsDark(useThemeStore.getState())).toBe(true);
    });

    it('selectIsDark returns false when light', () => {
      useThemeStore.getState().setTheme('light');
      expect(selectIsDark(useThemeStore.getState())).toBe(false);
    });
  });
});
