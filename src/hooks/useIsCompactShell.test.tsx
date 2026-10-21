import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { useIsCompactShell } from './useIsCompactShell';

function ShellLabel() {
  const compact = useIsCompactShell();
  return <span>{compact ? 'drawer' : 'permanent'}</span>;
}

describe('useIsCompactShell', () => {
  let listeners: Array<(event: MediaQueryListEvent) => void> = [];
  let queries: string[] = [];

  beforeEach(() => {
    listeners = [];
    queries = [];
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      queries.push(query);
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: (_: string, callback: (event: MediaQueryListEvent) => void) => {
          listeners.push(callback);
        },
        removeEventListener: (_: string, callback: (event: MediaQueryListEvent) => void) => {
          listeners = listeners.filter((listener) => listener !== callback);
        },
        dispatchEvent: vi.fn(),
      };
    });
  });

  it('renders the permanent sidebar on the server', () => {
    expect(renderToString(<ShellLabel />)).toContain('permanent');
  });

  it('is true on an upright iPad (768 to 1023 px) and a phone on its side', async () => {
    for (const width of [390, 768, 820, 844, 1023]) {
      window.innerWidth = width;
      const { result, unmount } = renderHook(() => useIsCompactShell());
      await waitFor(() => expect(result.current).toBe(true));
      unmount();
    }
  });

  it('is false from 1024 px (iPad landscape, laptops)', async () => {
    for (const width of [1024, 1180, 1280, 1920]) {
      window.innerWidth = width;
      const { result, unmount } = renderHook(() => useIsCompactShell());
      await waitFor(() => expect(result.current).toBe(false));
      unmount();
    }
  });

  it('watches the 1023 px media query and updates on resize', async () => {
    window.innerWidth = 800;
    const { result } = renderHook(() => useIsCompactShell());
    await waitFor(() => expect(result.current).toBe(true));
    expect(queries).toContain('(max-width: 1023px)');

    window.innerWidth = 1280;
    await act(async () => {
      listeners.forEach((listener) => listener(new Event('change') as MediaQueryListEvent));
    });
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('removes its listener on unmount', () => {
    window.innerWidth = 800;
    const { unmount } = renderHook(() => useIsCompactShell());
    expect(listeners).toHaveLength(1);
    unmount();
    expect(listeners).toHaveLength(0);
  });
});
