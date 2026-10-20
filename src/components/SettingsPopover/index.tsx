'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { logout } from '@/lib/auth';
import { LogOut, Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export function SettingsPopover() {
  const [open, setOpen] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Light <-> dark, based on what's on screen (same behaviour as ThemeToggle)
  const isDark = (resolvedTheme ?? theme) === 'dark';
  const cycleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const getThemeIcon = () => {
    if (!mounted) return <Sun className="h-4 w-4" />;
    return isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

  const getThemeLabel = () => {
    if (!mounted) return 'Theme';
    return isDark ? 'Dark' : 'Light';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="end" side="top">
        <div className="flex flex-col">
          <button
            onClick={cycleTheme}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {getThemeIcon()}
            <span>{getThemeLabel()}</span>
          </button>

          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>

          <div className="my-1 h-px bg-border" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
