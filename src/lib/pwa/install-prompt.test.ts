import { describe, it, expect } from 'vitest';
import {
  DISMISS_DAYS,
  DISMISS_STORAGE_KEY,
  detectPlatform,
  isDismissedRecently,
  isStandalone,
  readDismissedAt,
  resolveInstallPrompt,
  writeDismissedAt,
  type InstallPromptInput,
} from './install-prompt';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const DAY = 24 * 60 * 60 * 1000;

describe('detectPlatform', () => {
  it('recognises iPhone, Android and desktop', () => {
    expect(detectPlatform({ userAgent: IPHONE })).toBe('ios');
    expect(detectPlatform({ userAgent: ANDROID })).toBe('android');
    expect(detectPlatform({ userAgent: DESKTOP, platform: 'Win32' })).toBe('desktop');
  });

  it('treats an iPad in desktop-site mode (says Mac, has a touch screen) as iOS', () => {
    const macUa =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
    expect(detectPlatform({ userAgent: macUa, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(
      'ios',
    );
    expect(detectPlatform({ userAgent: macUa, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(
      'desktop',
    );
  });

  it('tells Chrome on iPhone (CriOS) from Safari', () => {
    const chromeIos =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
    expect(detectPlatform({ userAgent: chromeIos })).toBe('ios-chrome');
    expect(detectPlatform({ userAgent: IPHONE })).toBe('ios');
  });

  it.each([
    ['Instagram', IPHONE + ' Instagram 300.0', 'ios-webview'],
    ['Facebook', ANDROID + ' [FBAN/FB4A;FBAV/450.0]', 'android-webview'],
    ['Teams', IPHONE + ' Teams/6.0', 'ios-webview'],
    ['LinkedIn', IPHONE + ' LinkedInApp/9.0', 'ios-webview'],
    ['TikTok', ANDROID + ' musical_ly_2023 BytedanceWebview/d8a21c6', 'android-webview'],
    ['Outlook', IPHONE + ' Outlook-iOS/4.0', 'ios-webview'],
    ['the Google app', IPHONE + ' GSA/300.0', 'ios-webview'],
  ] as const)("treats %s's built-in browser as a web view", (_app, userAgent, expected) => {
    // These all still say "Safari/" (or Chrome) in their user agent, so they are matched by name
    expect(detectPlatform({ userAgent })).toBe(expected);
  });

  it('treats an iOS user agent with no "Safari/" token as a web view', () => {
    const bare =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
    expect(detectPlatform({ userAgent: bare })).toBe('ios-webview');
  });

  it('treats the Android system web view ("; wv)") as a web view', () => {
    const wv =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36';
    expect(detectPlatform({ userAgent: wv })).toBe('android-webview');
  });

  it('does not mistake a normal Android Chrome or desktop browser for a web view', () => {
    expect(detectPlatform({ userAgent: ANDROID })).toBe('android');
    expect(detectPlatform({ userAgent: DESKTOP + ' Teams/1.6' })).toBe('desktop');
  });
});

describe('isStandalone', () => {
  it('is true for the display-mode media query (Android, desktop installs)', () => {
    const matchMedia = (q: string) => ({ matches: q === '(display-mode: standalone)' });
    expect(isStandalone({ matchMedia })).toBe(true);
  });

  it('is true for the iOS home-screen flag', () => {
    expect(isStandalone({ navigatorStandalone: true })).toBe(true);
  });

  it('is false in a normal browser tab', () => {
    expect(
      isStandalone({ matchMedia: () => ({ matches: false }), navigatorStandalone: false }),
    ).toBe(false);
    expect(isStandalone({})).toBe(false);
  });

  it('is false when matchMedia throws', () => {
    expect(
      isStandalone({
        matchMedia: () => {
          throw new Error('nope');
        },
      }),
    ).toBe(false);
  });
});

describe('dismissal memory', () => {
  const now = Date.UTC(2026, 9, 20);

  it(`holds for ${DISMISS_DAYS} days, then asks again`, () => {
    expect(isDismissedRecently(now - 1 * DAY, now)).toBe(true);
    expect(isDismissedRecently(now - (DISMISS_DAYS * DAY - 1), now)).toBe(true);
    expect(isDismissedRecently(now - DISMISS_DAYS * DAY, now)).toBe(false);
    expect(isDismissedRecently(now - 90 * DAY, now)).toBe(false);
  });

  it('is not dismissed when never dismissed, or when the stored date is nonsense or in the future', () => {
    expect(isDismissedRecently(null, now)).toBe(false);
    expect(isDismissedRecently(Number.NaN, now)).toBe(false);
    expect(isDismissedRecently(now + DAY, now)).toBe(false);
  });

  it('writes and reads the time through storage', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    expect(readDismissedAt(storage)).toBeNull();
    expect(writeDismissedAt(now, storage)).toBe(true);
    expect(data.get(DISMISS_STORAGE_KEY)).toBe(String(now));
    expect(readDismissedAt(storage)).toBe(now);
  });

  it('ignores a corrupt stored value', () => {
    expect(readDismissedAt({ getItem: () => 'soon', setItem: () => {} })).toBeNull();
  });

  it('survives storage that throws (private windows, blocked site data)', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(readDismissedAt(broken)).toBeNull();
    expect(writeDismissedAt(now, broken)).toBe(false);
    expect(readDismissedAt(null)).toBeNull();
    expect(writeDismissedAt(now, null)).toBe(false);
  });
});

describe('resolveInstallPrompt', () => {
  const base: InstallPromptInput = {
    moment: 'orientation-passed',
    platform: 'ios',
    standalone: false,
    dismissedRecently: false,
    canPromptNatively: false,
  };

  it('shows the two manual steps on iPhone at a moment of value', () => {
    expect(resolveInstallPrompt(base)).toBe('ios-steps');
    expect(resolveInstallPrompt({ ...base, moment: 'print-submitted' })).toBe('ios-steps');
  });

  it('shows our card with the install button on Android, once the browser has offered its prompt', () => {
    const android = { ...base, platform: 'android' as const };
    expect(resolveInstallPrompt({ ...android, canPromptNatively: true })).toBe('native');
    // The browser hasn't said the app is installable (or it already is): nothing to offer
    expect(resolveInstallPrompt({ ...android, canPromptNatively: false })).toBe('hidden');
  });

  it('never shows without a moment of value (a first visit has none)', () => {
    expect(resolveInstallPrompt({ ...base, moment: null })).toBe('hidden');
    expect(
      resolveInstallPrompt({ ...base, moment: null, platform: 'android', canPromptNatively: true }),
    ).toBe('hidden');
  });

  it('never shows once installed', () => {
    expect(resolveInstallPrompt({ ...base, standalone: true })).toBe('hidden');
    expect(
      resolveInstallPrompt({
        ...base,
        standalone: true,
        platform: 'android',
        canPromptNatively: true,
      }),
    ).toBe('hidden');
  });

  it('never shows on desktop, even if the browser offers an install prompt', () => {
    expect(resolveInstallPrompt({ ...base, platform: 'desktop', canPromptNatively: true })).toBe(
      'hidden',
    );
  });

  it('words the steps for Chrome on iPhone separately from Safari', () => {
    expect(resolveInstallPrompt({ ...base, platform: 'ios-chrome' })).toBe('ios-chrome-steps');
  });

  it('inside another app, says to open the real browser instead of showing steps that cannot work', () => {
    expect(resolveInstallPrompt({ ...base, platform: 'ios-webview' })).toBe('open-in-safari');
    expect(resolveInstallPrompt({ ...base, platform: 'android-webview' })).toBe('open-in-chrome');
    // ...and the usual rules still apply
    expect(resolveInstallPrompt({ ...base, platform: 'ios-webview', moment: null })).toBe('hidden');
    expect(
      resolveInstallPrompt({ ...base, platform: 'ios-webview', dismissedRecently: true }),
    ).toBe('hidden');
    expect(resolveInstallPrompt({ ...base, platform: 'android-webview', standalone: true })).toBe(
      'hidden',
    );
  });

  it('stays hidden after "Not now"', () => {
    expect(resolveInstallPrompt({ ...base, dismissedRecently: true })).toBe('hidden');
    expect(
      resolveInstallPrompt({
        ...base,
        dismissedRecently: true,
        platform: 'android',
        canPromptNatively: true,
      }),
    ).toBe('hidden');
  });
});
