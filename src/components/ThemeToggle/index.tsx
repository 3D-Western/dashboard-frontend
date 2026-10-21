'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

// Switches straight between light and dark. It used to cycle light -> dark -> system, but with
// dark as the default the first tap went dark -> system, which often changed nothing on screen.
// The button shows (and says) what a tap switches TO: a sun while dark, a moon while light.
// Showing the current mode instead read as inverted: a moon on a dark page looked like "go dark".
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional for hydration safety
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground fine:h-8 fine:w-8"
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  // What's actually on screen (a saved "system" preference resolves to light or dark)
  const isDark = (resolvedTheme ?? theme) === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground fine:h-8 fine:w-8"
      title={label}
      aria-label={label}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
