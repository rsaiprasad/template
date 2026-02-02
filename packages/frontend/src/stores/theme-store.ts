import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Theme } from '@/types';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
}

interface ThemeActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

type ThemeStore = ThemeState & ThemeActions;

/**
 * Get the system preference for color scheme
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve the theme based on user preference and system
 */
function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Apply theme to document
 */
function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system' as Theme,
      resolvedTheme: getSystemTheme(),

      setTheme: (theme: Theme) => {
        const resolved = resolveTheme(theme);
        applyTheme(resolved);
        set({ theme, resolvedTheme: resolved });
      },

      toggleTheme: () => {
        const currentResolved = get().resolvedTheme;
        const newTheme = currentResolved === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        set({ theme: newTheme, resolvedTheme: newTheme });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolveTheme(state.theme);
          applyTheme(resolved);
          // Update resolved theme after rehydration
          state.resolvedTheme = resolved;
        }
      },
    }
  )
);

/**
 * Initialize theme on app start
 */
export function initializeTheme() {
  const state = useThemeStore.getState();
  const resolved = resolveTheme(state.theme);
  applyTheme(resolved);

  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentTheme = useThemeStore.getState().theme;
      if (currentTheme === 'system') {
        const newResolved = getSystemTheme();
        applyTheme(newResolved);
        useThemeStore.setState({ resolvedTheme: newResolved });
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }
}

// Selectors
export const selectTheme = (state: ThemeStore) => state.theme;
export const selectResolvedTheme = (state: ThemeStore) => state.resolvedTheme;
export const selectIsDark = (state: ThemeStore) => state.resolvedTheme === 'dark';

export default useThemeStore;
