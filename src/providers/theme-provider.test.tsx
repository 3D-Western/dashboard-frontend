import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from './theme-provider';

// Mock next-themes
vi.mock('next-themes', () => ({
  ThemeProvider: ({
    children,
    attribute,
    defaultTheme,
    enableSystem,
  }: {
    children: ReactNode;
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
  }) => {
    return (
      <div
        data-testid="theme-provider"
        data-attribute={attribute}
        data-default-theme={defaultTheme}
        data-enable-system={enableSystem}
      >
        {children}
      </div>
    );
  },
}));

describe('ThemeProvider', () => {
  it('renders children correctly', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Child content</div>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('wraps children with NextThemesProvider', () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
  });

  it('configures NextThemesProvider with class attribute', () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    const provider = screen.getByTestId('theme-provider');
    expect(provider).toHaveAttribute('data-attribute', 'class');
  });

  it('sets default theme to system', () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    const provider = screen.getByTestId('theme-provider');
    expect(provider).toHaveAttribute('data-default-theme', 'system');
  });

  it('enables system theme detection', () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    const provider = screen.getByTestId('theme-provider');
    expect(provider).toHaveAttribute('data-enable-system', 'true');
  });

  it('renders multiple children', () => {
    render(
      <ThemeProvider>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
        <div data-testid="child3">Child 3</div>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
    expect(screen.getByTestId('child3')).toBeInTheDocument();
  });

  it('handles nested components', () => {
    render(
      <ThemeProvider>
        <div>
          <span data-testid="nested">Nested content</span>
        </div>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('nested')).toBeInTheDocument();
  });
});
