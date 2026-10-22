import { useBelowWidth } from './useBelowWidth';

/** Phone-sized window (below Tailwind `md`, 768 px): table rows become cards, lists switch layout. */
export const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  return useBelowWidth(MOBILE_BREAKPOINT);
}
