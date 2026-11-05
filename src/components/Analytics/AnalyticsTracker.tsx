'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { flush, screenOfPath, setAnalyticsEnabled, trackScreen, trackTap } from '@/lib/analytics';
import { useUser } from '@/providers/user-provider';
import { hasAnyAdminPermission } from '@/types/user';

const INTERACTIVE =
  'button, a[href], input, textarea, select, summary, [role="button"], [role="radio"], [role="checkbox"], [role="tab"], [role="menuitem"], [role="switch"]';

/** A fixed label for what was tapped: an explicit `data-track`, else just the kind of control. Never its text. */
export function tapLabel(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const control = target.closest<HTMLElement>(INTERACTIVE);
  if (!control) return null;
  const named = control.closest<HTMLElement>('[data-track]')?.dataset.track;
  if (named) return named;
  const role = control.getAttribute('role');
  if (control.tagName === 'A') return 'link';
  if (control.tagName === 'INPUT' || control.tagName === 'TEXTAREA' || control.tagName === 'SELECT') {
    return role === 'radio' || (control as HTMLInputElement).type === 'radio' ? 'choice' : 'field';
  }
  if (role === 'radio' || role === 'checkbox' || role === 'switch') return 'choice';
  return 'button';
}

/**
 * Reports, for the steps-to-submit metric (P-137), which screen a student is on and what they tap.
 * Renders nothing. Staff (anyone with an admin-section permission) are left out: their clicks are not
 * the student journey being measured. See lib/analytics.ts for what is and is not collected.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const user = useUser();
  const staff = hasAnyAdminPermission(user);

  useEffect(() => {
    setAnalyticsEnabled(!staff);
  }, [staff]);

  useEffect(() => {
    if (staff) return;
    const screen = screenOfPath(pathname);
    if (screen) trackScreen(screen);
  }, [pathname, staff]);

  useEffect(() => {
    if (staff) return;
    const onClick = (event: MouseEvent) => {
      const label = tapLabel(event.target);
      if (label) trackTap(label);
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [staff]);

  return null;
}
