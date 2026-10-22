// ---------------------------------------------------------------------------------------------
// When to offer "add the app to your home screen". This file is the rules and nothing else (no
// React), so every case is easy to test. The rules, from Troy's brief (roadmap: "Add to home
// screen prompt"):
//  - only at a moment of value, never on a first visit (the caller names the moment)
//  - never when the app is already installed, and never on desktop
//  - Android/Chrome: only when the browser has offered its install prompt to us
//  - iPhone/iPad: always possible, but only by hand (Share -> Add to Home Screen)
//  - after "Not now", stay quiet for 30 days
// ---------------------------------------------------------------------------------------------

/** The moments we ask at. Each one is a time the app is obviously useful to the student. */
export type InstallMoment = 'orientation-passed' | 'print-submitted';

/**
 * Where the page is open. The "-webview" kinds are browsers inside other apps (Teams, Instagram,
 * the Google app, ...): they have no Add to Home Screen, so the student must open the page in the
 * real browser first.
 */
export type InstallPlatform =
  | 'ios'
  | 'ios-chrome'
  | 'ios-webview'
  | 'android'
  | 'android-webview'
  | 'desktop';

/**
 * What to show: nothing; our own card with the browser's install button (Android); the manual
 * steps for Safari or for Chrome on iPhone; or a pointer to open the page in the real browser.
 */
export type InstallPromptMode =
  | 'hidden'
  | 'native'
  | 'ios-steps'
  | 'ios-chrome-steps'
  | 'open-in-safari'
  | 'open-in-chrome';

export const DISMISS_DAYS = 30;
export const DISMISS_STORAGE_KEY = '3dw.install-prompt.dismissed-at';
const DAY_MS = 24 * 60 * 60 * 1000;

// Apps that open links in their own embedded browser. Some of them still say "Safari/" in their
// user agent, so they are named. (`GSA/` is the Google app.)
const IN_APP_BROWSER =
  /FBAN|FBAV|Instagram|Snapchat|MicroMessenger|Line\/|Twitter|Teams\/|LinkedInApp|TikTok|musical_ly|BytedanceWebview|Outlook|GSA\//i;

/** True for a browser embedded in another app, on a phone or tablet. */
function isWebview(userAgent: string, ios: boolean): boolean {
  if (IN_APP_BROWSER.test(userAgent)) return true;
  // A real iOS browser (Safari, Chrome, Firefox) always says "Safari/"; a bare web view doesn't
  if (ios) return !/Safari\//.test(userAgent);
  // Android's system web view marks itself "; wv)"
  return /; wv\)/.test(userAgent);
}

interface PlatformInput {
  userAgent: string;
  /** navigator.platform: an iPad in "desktop site" mode says MacIntel */
  platform?: string;
  maxTouchPoints?: number;
}

export function detectPlatform({
  userAgent,
  platform = '',
  maxTouchPoints = 0,
}: PlatformInput): InstallPlatform {
  // iPadOS 13+ reports itself as a Mac; a real Mac has no touch screen
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  if (ios) {
    if (isWebview(userAgent, true)) return 'ios-webview';
    return /CriOS/.test(userAgent) ? 'ios-chrome' : 'ios';
  }
  if (/Android/.test(userAgent)) {
    return isWebview(userAgent, false) ? 'android-webview' : 'android';
  }
  return 'desktop';
}

interface StandaloneInput {
  /** window.matchMedia, when the browser has it */
  matchMedia?: (query: string) => { matches: boolean };
  /** iOS Safari's own flag, set when opened from the home screen */
  navigatorStandalone?: boolean;
}

/** True when the app is already running as an installed app (not in a browser tab). */
export function isStandalone({ matchMedia, navigatorStandalone }: StandaloneInput): boolean {
  if (navigatorStandalone === true) return true;
  try {
    return matchMedia?.('(display-mode: standalone)').matches === true;
  } catch {
    return false;
  }
}

/** True when "Not now" was tapped less than 30 days ago. A date in the future (clock change) doesn't count. */
export function isDismissedRecently(dismissedAt: number | null, now: number): boolean {
  if (dismissedAt === null || !Number.isFinite(dismissedAt)) return false;
  const age = now - dismissedAt;
  return age >= 0 && age < DISMISS_DAYS * DAY_MS;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Private windows and blocked site data make storage throw; the prompt must still work (it will
// simply be shown again next time).
function safeStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readDismissedAt(storage: StorageLike | null = safeStorage()): number | null {
  try {
    const raw = storage?.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeDismissedAt(
  now: number,
  storage: StorageLike | null = safeStorage(),
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(DISMISS_STORAGE_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

export interface InstallPromptInput {
  /** The moment of value we are at, or null when there isn't one (then nothing is ever shown). */
  moment: InstallMoment | null;
  platform: InstallPlatform;
  standalone: boolean;
  dismissedRecently: boolean;
  /** Chrome has handed us its install prompt (beforeinstallprompt) and we are holding it */
  canPromptNatively: boolean;
}

export function resolveInstallPrompt(input: InstallPromptInput): InstallPromptMode {
  if (!input.moment || input.standalone || input.dismissedRecently) return 'hidden';
  switch (input.platform) {
    case 'ios':
      return 'ios-steps';
    case 'ios-chrome':
      return 'ios-chrome-steps';
    case 'ios-webview':
      return 'open-in-safari';
    case 'android-webview':
      return 'open-in-chrome';
    case 'android':
      return input.canPromptNatively ? 'native' : 'hidden';
    default:
      return 'hidden';
  }
}
