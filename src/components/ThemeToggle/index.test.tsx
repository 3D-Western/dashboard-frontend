import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './index';
import { renderToString } from 'react-dom/server';

const setThemeSpy = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => {
    const [theme, setThemeState] = React.useState<'light' | 'dark' | 'system'>('light');
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
  });

  it('shows loading state before mount (SSR safety)', () => {
    const output = renderToString(<ThemeToggle />);
    expect(output).toContain('Toggle theme');
    expect(output).toContain('disabled');
  });

  it('cycles through light -> dark -> system -> light', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const lightButton = await screen.findByLabelText(/light mode/i);
    await user.click(lightButton);
    expect(setThemeSpy).toHaveBeenLastCalledWith('dark');

    const darkButton = await screen.findByLabelText(/dark mode/i);
    await user.click(darkButton);
    expect(setThemeSpy).toHaveBeenLastCalledWith('system');

    const systemButton = await screen.findByLabelText(/system mode/i);
    await user.click(systemButton);
    expect(setThemeSpy).toHaveBeenLastCalledWith('light');
  });

  it('shows current theme label and title', async () => {
    render(<ThemeToggle />);
    const button = await screen.findByLabelText(/light mode/i);

    expect(button).toHaveAttribute('title', expect.stringContaining('Light mode'));
  });

  it('provides an accessible button label', async () => {
    render(<ThemeToggle />);
    const button = await screen.findByLabelText(/light mode/i);

    expect(button).toBeInTheDocument();
  });
});
