import { beforeEach, describe, expect, it } from 'bun:test';
import { useThemeStore } from './theme-store';

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

});
