import * as React from 'react';

/**
 * True while the window is narrower than `breakpoint` px. Server render and first paint report
 * false, so markup must also carry the CSS breakpoint (`lg:` etc.) that matches the number.
 */
export function useBelowWidth(breakpoint: number) {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      mediaQuery.addEventListener('change', onStoreChange);
      return () => mediaQuery.removeEventListener('change', onStoreChange);
    },
    () => window.innerWidth < breakpoint,
    () => false,
  );
}
