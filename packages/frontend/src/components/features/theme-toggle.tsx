import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { selectResolvedTheme, selectTheme, useThemeStore } from '@/stores/theme-store';
import type { Theme } from '@/types';
import { Monitor, Moon, Sun } from 'lucide-react';
import type * as React from 'react';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const themeOptions: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle() {
  const theme = useThemeStore(selectTheme);
  const resolvedTheme = useThemeStore(selectResolvedTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <CurrentIcon className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={theme === option.value ? 'bg-accent' : ''}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>{option.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggleButton() {
  const resolvedTheme = useThemeStore(selectResolvedTheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export default ThemeToggle;
