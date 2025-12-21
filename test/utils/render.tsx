import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { UserProvider } from '@/providers/user-provider';
import { ThemeProvider } from 'next-themes';
import { User } from '@/types/user';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * User to provide in UserProvider context
   * @default null
   */
  user?: User | null;

  /**
   * Theme for ThemeProvider
   * @default 'light'
   */
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Custom render function that wraps components with necessary providers
 *
 * @example
 * ```tsx
 * import { render, screen } from '@test/utils/render';
 * import { createMockUser } from '@test/utils/mockFactories';
 *
 * const user = createMockUser();
 * render(<MyComponent />, { user });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  { user = null, theme = 'light', ...renderOptions }: CustomRenderOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme={theme}
        enableSystem
        disableTransitionOnChange
      >
        <UserProvider user={user}>{children}</UserProvider>
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };
export { default as userEvent } from '@testing-library/user-event';
