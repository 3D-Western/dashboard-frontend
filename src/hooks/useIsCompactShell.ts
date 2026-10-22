import { useBelowWidth } from './useBelowWidth';

/**
 * Window too narrow for a permanent sidebar (below Tailwind `lg`, 1024 px): the sidebar is a
 * drawer and the page gets the full width. Used only by the sidebar and its trigger; cards versus
 * tables keep using `useIsMobile` (768 px). Keep in step with the `lg:` classes in ui/sidebar.tsx.
 */
export const COMPACT_SHELL_BREAKPOINT = 1024;

export function useIsCompactShell() {
  return useBelowWidth(COMPACT_SHELL_BREAKPOINT);
}
