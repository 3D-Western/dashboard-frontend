import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './index';
import { renderToString } from 'react-dom/server';

const setThemeSpy = vi.fn();
let initialTheme: 'light' | 'dark' | 'system' = 'light';

vi.mock('next-themes', () => ({
  useTheme: () => {
    const [theme, setThemeState] = React.useState<'light' | 'dark' | 'system'>(initialTheme);
    const setTheme = (nextTheme: string) => {
      setThemeSpy(nextTheme);
      setThemeState(nextTheme as 'light' | 'dark' | 'system');
    };

    return {
      theme,
      setTheme,
      themes: ['light', 'dark', 'system'],
      resolvedTheme: theme,
      systemTheme: 'light',
    };
  },
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    setThemeSpy.mockClear();
    initialTheme = 'light';
  });

  it('shows loading state before mount (SSR safety)', () => {
    const output = renderToString(<ThemeToggle />);
    expect(output).toContain('Toggle theme');
    expect(output).toContain('disabled');
  });

  it('switches straight between light and dark', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(await screen.findByLabelText(/switch to dark mode/i));
    expect(setThemeSpy).toHaveBeenLastCalledWith('dark');

    await user.click(await screen.findByLabelText(/switch to light mode/i));
    expect(setThemeSpy).toHaveBeenLastCalledWith('light');
  });

  it('offers dark mode (a moon) while the page is light', async () => {
    render(<ThemeToggle />);
    const button = await screen.findByRole('button', { name: 'Switch to dark mode' });

    expect(button).toHaveAttribute('title', 'Switch to dark mode');
    expect(button.querySelector('svg')).toHaveClass('lucide-moon');
  });

  it('offers light mode (a sun) while the page is dark', async () => {
    initialTheme = 'dark';
    render(<ThemeToggle />);
    const button = await screen.findByRole('button', { name: 'Switch to light mode' });

    expect(button).toHaveAttribute('title', 'Switch to light mode');
    expect(button.querySelector('svg')).toHaveClass('lucide-sun');
  });

  it('is a 44 px tap target on phones and 32 px from md', async () => {
    render(<ThemeToggle />);
    const button = await screen.findByLabelText(/switch to dark mode/i);

    expect(button).toHaveClass('h-11', 'w-11', 'fine:h-8', 'fine:w-8');
  });
});
