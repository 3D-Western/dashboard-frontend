// @/providers/theme-provider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Remove forcedTheme="dark" to enable theme switching

  return (
    <NextThemesProvider attribute="class" forcedTheme="dark">
      {children}
    </NextThemesProvider>
  );
}
