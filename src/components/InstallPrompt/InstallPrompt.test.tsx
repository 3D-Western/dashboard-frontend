import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearDeferredInstallPrompt, startCapturingInstallPrompt } from '@/lib/pwa/install-event';
import { DISMISS_STORAGE_KEY } from '@/lib/pwa/install-prompt';
import { InstallPrompt } from './InstallPrompt';
import { resetInstallPromptSessionState } from './useInstallPrompt';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const realMatchMedia = window.matchMedia;
let stopCapturing: (() => void) | undefined;

function setDevice(userAgent: string, { standalone = false, iosStandalone = false } = {}) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  Object.defineProperty(navigator, 'standalone', { value: iosStandalone, configurable: true });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: standalone && query === '(display-mode: standalone)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

/** The browser offers its install prompt (Android Chrome does this on its own, once). */
function offerNativePrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

beforeEach(() => {
  stopCapturing = startCapturingInstallPrompt();
});

afterEach(() => {
  stopCapturing?.();
  // Still mounted here (RTL's cleanup runs after this), so let React see the change
  act(() => clearDeferredInstallPrompt());
  resetInstallPromptSessionState();
  window.localStorage.clear();
  window.matchMedia = realMatchMedia;
  vi.restoreAllMocks();
});

describe('InstallPrompt on an iPhone', () => {
  beforeEach(() => setDevice(IPHONE));

  it('shows the two steps (Share, then Add to Home Screen) with their icons', () => {
    const { container } = render(<InstallPrompt moment="orientation-passed" />);

    expect(
      screen.getByRole('region', { name: /keep 3d western on your home screen/i }),
    ).toBeInTheDocument();
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(2);
    expect(steps[0]).toHaveTextContent(/share/i);
    expect(steps[1]).toHaveTextContent(/add to home screen/i);
    // Icons are decoration: the words carry the meaning
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
    // There is no install button on iOS
    expect(screen.queryByRole('button', { name: /install/i })).not.toBeInTheDocument();
  });

  it('points to the notification setting instead of saying notifications are coming', () => {
    render(<InstallPrompt moment="print-submitted" />);
    expect(
      screen.getByRole('heading', { name: 'Keep 3D Western on your home screen' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/turn on notifications \(in Settings\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it('keeps the steps a real list for screen readers', () => {
    render(<InstallPrompt moment="orientation-passed" />);
    expect(screen.getByRole('list')).toHaveAttribute('role', 'list');
  });

  it('uses the short heading in its "note" form', () => {
    render(<InstallPrompt moment="orientation-passed" variant="note" />);
    expect(
      screen.getByRole('heading', { name: 'Add the 3D Western app to your home screen' }),
    ).toBeInTheDocument();
  });

  it('shows nothing without a moment of value', () => {
    const { container } = render(<InstallPrompt moment={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing when already opened from the home screen', () => {
    setDevice(IPHONE, { iosStandalone: true });
    const { container } = render(<InstallPrompt moment="orientation-passed" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides on "Not now" and remembers it for next time', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<InstallPrompt moment="orientation-passed" />);

    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(Number(window.localStorage.getItem(DISMISS_STORAGE_KEY))).toBeGreaterThan(0);

    // A later visit (new page load) stays quiet
    unmount();
    resetInstallPromptSessionState();
    const { container } = render(<InstallPrompt moment="print-submitted" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('stays hidden when "Not now" was tapped 10 days ago, and returns after 30', () => {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now() - 10 * 86_400_000));
    const { container, unmount } = render(<InstallPrompt moment="orientation-passed" />);
    expect(container).toBeEmptyDOMElement();
    unmount();

    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now() - 31 * 86_400_000));
    render(<InstallPrompt moment="orientation-passed" />);
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('still works, and still dismisses for the session, when storage is blocked', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    render(<InstallPrompt moment="orientation-passed" />);
    await user.click(screen.getByRole('button', { name: 'Not now' }));

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('can be reached and used from the keyboard', async () => {
    const user = userEvent.setup();
    render(<InstallPrompt moment="orientation-passed" />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Not now' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});

describe('InstallPrompt on Chrome for iPhone', () => {
  it('words the steps for Chrome, not Safari', () => {
    setDevice(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
    );
    render(<InstallPrompt moment="orientation-passed" />);

    const steps = screen.getAllByRole('listitem');
    expect(steps[0]).toHaveTextContent(/address bar at the top of Chrome/i);
    expect(steps[0]).not.toHaveTextContent(/safari/i);
    expect(steps[1]).toHaveTextContent(/add to home screen/i);
  });
});

describe('InstallPrompt inside another app (web view)', () => {
  it('on iPhone, says to open the page in Safari and shows no steps', () => {
    setDevice(IPHONE + ' Teams/6.0');
    render(<InstallPrompt moment="orientation-passed" />);

    expect(screen.getByText(/open in safari/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /install/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
  });

  it('on Android, says to open the page in Chrome, even if a prompt was offered', () => {
    setDevice(ANDROID + ' Instagram 300.0');
    render(<InstallPrompt moment="print-submitted" />);
    offerNativePrompt();

    expect(screen.getByText(/open in browser/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /install/i })).not.toBeInTheDocument();
  });

  it('can be dismissed like the rest', async () => {
    const user = userEvent.setup();
    setDevice(IPHONE + ' GSA/300.0');
    render(<InstallPrompt moment="orientation-passed" />);

    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});

describe('InstallPrompt on Android', () => {
  beforeEach(() => setDevice(ANDROID));

  it('waits for the browser to offer its install prompt', () => {
    const { container } = render(<InstallPrompt moment="orientation-passed" />);
    expect(container).toBeEmptyDOMElement();

    const event = offerNativePrompt();

    expect(event.defaultPrevented).toBe(true); // Chrome's own banner is suppressed
    expect(screen.getByRole('button', { name: 'Install app' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('still shows when the browser offered the prompt before the screen was opened', () => {
    offerNativePrompt();
    render(<InstallPrompt moment="print-submitted" />);
    expect(screen.getByRole('button', { name: 'Install app' })).toBeInTheDocument();
  });

  it('opens the browser install dialog, then goes away', async () => {
    const user = userEvent.setup();
    render(<InstallPrompt moment="orientation-passed" />);
    const event = offerNativePrompt('accepted');

    await user.click(screen.getByRole('button', { name: 'Install app' }));

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    // Said yes: not recorded as a "Not now"
    expect(window.localStorage.getItem(DISMISS_STORAGE_KEY)).toBeNull();
  });

  it('counts cancelling the browser dialog as "Not now"', async () => {
    const user = userEvent.setup();
    render(<InstallPrompt moment="orientation-passed" />);
    offerNativePrompt('dismissed');

    await user.click(screen.getByRole('button', { name: 'Install app' }));

    await vi.waitFor(() =>
      expect(Number(window.localStorage.getItem(DISMISS_STORAGE_KEY))).toBeGreaterThan(0),
    );
  });

  it('goes away when the app gets installed some other way', () => {
    render(<InstallPrompt moment="orientation-passed" />);
    offerNativePrompt();
    expect(screen.getByRole('region')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('shows nothing when already installed (standalone)', () => {
    setDevice(ANDROID, { standalone: true });
    const { container } = render(<InstallPrompt moment="orientation-passed" />);
    offerNativePrompt();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing without a moment of value, even with the prompt in hand', () => {
    const { container } = render(<InstallPrompt moment={null} />);
    offerNativePrompt();
    expect(container).toBeEmptyDOMElement();
  });
});

describe('InstallPrompt on desktop', () => {
  it('never shows, even if the browser offers an install prompt', () => {
    setDevice(DESKTOP);
    const { container } = render(<InstallPrompt moment="orientation-passed" />);
    offerNativePrompt();
    expect(container).toBeEmptyDOMElement();
  });
});
