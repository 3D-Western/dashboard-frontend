'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  subscribeToInstallPrompt,
} from '@/lib/pwa/install-event';
import {
  detectPlatform,
  isDismissedRecently,
  isStandalone,
  readDismissedAt,
  resolveInstallPrompt,
  writeDismissedAt,
  type InstallMoment,
  type InstallPlatform,
  type InstallPromptMode,
} from '@/lib/pwa/install-prompt';

// What we know about this device. It's read straight from the browser, so it is only available on
// the client: the server and the first render say 'unknown', which shows nothing (no flash, no
// hydration mismatch).
const UNKNOWN = 'unknown';

const environmentListeners = new Set<() => void>();
const notifyEnvironment = () => environmentListeners.forEach((listener) => listener());

// Kept in this tab only: if storage is blocked, "Not now" still holds until the page is reloaded
let dismissedThisSession = false;

/** "platform|standalone|dismissed", compared by value so React only re-renders on a real change. */
function readEnvironment(): string {
  const platform = detectPlatform({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });
  const standalone = isStandalone({
    matchMedia: window.matchMedia?.bind(window),
    navigatorStandalone: (navigator as Navigator & { standalone?: boolean }).standalone,
  });
  const dismissed = dismissedThisSession || isDismissedRecently(readDismissedAt(), Date.now());
  return `${platform}|${standalone ? 1 : 0}|${dismissed ? 1 : 0}`;
}

function subscribeToEnvironment(listener: () => void): () => void {
  environmentListeners.add(listener);
  const media = window.matchMedia?.('(display-mode: standalone)');
  media?.addEventListener?.('change', listener);
  // "Not now" in another tab
  window.addEventListener('storage', listener);
  return () => {
    environmentListeners.delete(listener);
    media?.removeEventListener?.('change', listener);
    window.removeEventListener('storage', listener);
  };
}

export interface InstallPromptState {
  mode: InstallPromptMode;
  /** Android: open the browser's install dialog */
  install: () => Promise<void>;
  /** "Not now": hide it for 30 days */
  dismiss: () => void;
}

/**
 * Whether to show the install prompt right now, and what it should do. Pass the moment of value
 * we are at, or null when there isn't one (it then never shows).
 */
export function useInstallPrompt(moment: InstallMoment | null): InstallPromptState {
  const environment = useSyncExternalStore(subscribeToEnvironment, readEnvironment, () => UNKNOWN);
  const deferred = useSyncExternalStore(
    subscribeToInstallPrompt,
    getDeferredInstallPrompt,
    () => null,
  );

  const [platform, standalone, dismissed] = environment.split('|');
  const mode =
    environment === UNKNOWN
      ? 'hidden'
      : resolveInstallPrompt({
          moment,
          platform: platform as InstallPlatform,
          standalone: standalone === '1',
          dismissedRecently: dismissed === '1',
          canPromptNatively: deferred !== null,
        });

  const dismiss = useCallback(() => {
    dismissedThisSession = true;
    writeDismissedAt(Date.now());
    notifyEnvironment();
  }, []);

  const install = useCallback(async () => {
    const event = getDeferredInstallPrompt();
    if (!event) return;
    // The event can be used once, whatever the student chooses
    clearDeferredInstallPrompt();
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      // Said no to the browser's own dialog: don't ask again for a while
      if (outcome === 'dismissed') dismiss();
    } catch {
      // The browser refused to show it: nothing to do
    }
  }, [dismiss]);

  return { mode, install, dismiss };
}

/** Test helper: forget "Not now" held in memory. */
export function resetInstallPromptSessionState() {
  dismissedThisSession = false;
}
