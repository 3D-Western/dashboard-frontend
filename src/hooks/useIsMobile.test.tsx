import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { useIsMobile } from './useIsMobile';

function MobileLabel() {
  const isMobile = useIsMobile();
  return <span>{isMobile ? 'mobile' : 'desktop'}</span>;
}

describe('useIsMobile', () => {
  let listeners: Array<(event: MediaQueryListEvent) => void> = [];
  let addEventListener: ReturnType<typeof vi.fn>;
  let removeEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listeners = [];
    addEventListener = vi.fn((_: string, callback: (event: MediaQueryListEvent) => void) => {
      listeners.push(callback);
    });
    removeEventListener = vi.fn((_: string, callback: (event: MediaQueryListEvent) => void) => {
      listeners = listeners.filter((listener) => listener !== callback);
    });

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener,
      removeEventListener,
      dispatchEvent: vi.fn(),
    }));
  });

  it('returns false on server (SSR safety)', () => {
    const output = renderToString(<MobileLabel />);
    expect(output).toContain('desktop');
  });

  it('returns true when viewport is below 768px', async () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('returns false when viewport is 768px or wider', async () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('updates on window resize', async () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    window.innerWidth = 1024;
    await act(async () => {
      listeners.forEach((listener) => listener(new Event('change') as MediaQueryListEvent));
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('cleans up event listener on unmount', () => {
    window.innerWidth = 500;
    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(removeEventListener).toHaveBeenCalledTimes(1);
  });
});
