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

  it("doesn't offer anything inside another app's browser", () => {
    expect(detectPlatform({ userAgent: IPHONE + ' Instagram 300.0' })).toBe('other');
    expect(detectPlatform({ userAgent: ANDROID + ' [FBAN/FB4A;FBAV/450.0]' })).toBe('other');
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

  it('never shows on desktop or in other browsers, even if the browser offers an install prompt', () => {
    expect(resolveInstallPrompt({ ...base, platform: 'desktop', canPromptNatively: true })).toBe(
      'hidden',
    );
    expect(resolveInstallPrompt({ ...base, platform: 'other', canPromptNatively: true })).toBe(
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
