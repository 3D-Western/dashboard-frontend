import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { notificationsApi } from '@/api/client/notifications';
import { ApiError } from '@/api/client/errors';
import type { NotificationPreference, PushDevice } from '@/types/notifications';
import { NotificationsCard } from './NotificationsCard';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));
vi.mock('@/api/client/notifications', () => ({
  notificationsApi: {
    getConfig: vi.fn(),
    listDevices: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    removeDevice: vi.fn(),
    sendTest: vi.fn(),
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1';
const IPHONE_TEAMS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Teams/1.0';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/this-phone';
// SHA-256 of ENDPOINT, as the server reports it: computed in beforeAll with the same function
let ENDPOINT_ID = '';

const prefs = (overrides: Record<string, boolean> = {}): NotificationPreference[] => [
  {
    type: 'TRAINING_REMINDERS',
    label: 'Training reminders',
    description: 'A refresher is due, or an update is due by its deadline.',
    pushEnabled: overrides.TRAINING_REMINDERS ?? true,
  },
  {
    type: 'SIGNOFF_RESULTS',
    label: 'Sign-off results',
    description: 'A supervisor approved your training, or asked you to come back.',
    pushEnabled: overrides.SIGNOFF_RESULTS ?? true,
  },
  {
    type: 'PRINT_JOBS',
    label: 'Print updates',
    description: 'Your print was approved, finished or is ready for pickup.',
    pushEnabled: overrides.PRINT_JOBS ?? true,
  },
];

const device = (id: number, label: string, endpointId: string): PushDevice => ({
  id,
  label,
  endpointId,
  createdAt: '2026-10-20T12:00:00Z',
  lastSuccessAt: null,
});

interface Browser {
  userAgent?: string;
  standalone?: boolean;
  /** Notification.permission */
  permission?: NotificationPermission;
  /** What the browser's prompt answers when the student is asked */
  promptAnswer?: NotificationPermission;
  /** Whether this browser has a subscription already */
  subscribed?: boolean;
  /** Missing pieces of the browser */
  without?: ('serviceWorker' | 'PushManager' | 'Notification')[];
  registration?: boolean;
}

const requestPermission = vi.fn();
const subscribe = vi.fn();
const unsubscribe = vi.fn();
const originals = {
  Notification: Object.getOwnPropertyDescriptor(globalThis, 'Notification'),
  PushManager: Object.getOwnPropertyDescriptor(globalThis, 'PushManager'),
  matchMedia: window.matchMedia,
};

function subscription(endpoint = ENDPOINT) {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'P256', auth: 'AUTH' } }),
    unsubscribe,
  };
}

function setBrowser({
  userAgent = ANDROID,
  standalone = false,
  permission = 'default',
  promptAnswer = 'granted',
  subscribed = false,
  without = [],
  registration = true,
}: Browser = {}) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  Object.defineProperty(navigator, 'standalone', { value: false, configurable: true });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: standalone && query === '(display-mode: standalone)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  requestPermission.mockResolvedValue(promptAnswer);
  let current: ReturnType<typeof subscription> | null = subscribed ? subscription() : null;
  subscribe.mockImplementation(async () => (current = subscription()));
  unsubscribe.mockImplementation(async () => {
    current = null;
    return true;
  });
  const reg = { pushManager: { getSubscription: vi.fn(async () => current), subscribe } };

  if (without.includes('serviceWorker')) {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
  } else {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue(registration ? reg : undefined),
        ready: registration ? Promise.resolve(reg) : new Promise(() => {}),
      },
      configurable: true,
    });
  }
  if (without.includes('Notification')) {
    delete (globalThis as Record<string, unknown>).Notification;
  } else {
    Object.defineProperty(globalThis, 'Notification', {
      value: Object.assign(function Notification() {}, { requestPermission, permission }),
      configurable: true,
      writable: true,
    });
  }
  if (without.includes('PushManager')) {
    delete (globalThis as Record<string, unknown>).PushManager;
  } else {
    Object.defineProperty(globalThis, 'PushManager', {
      value: function PushManager() {},
      configurable: true,
      writable: true,
    });
  }
}

function serverReady({ devices = [] as PushDevice[], preferences = prefs() } = {}) {
  vi.mocked(notificationsApi.getConfig).mockResolvedValue({
    enabled: true,
    publicKey:
      'BDWSbKPR_UPC_Ix0kQrxwNefe1J23oDgu8xJFhudbQwEov9T9_3m5bFmvcQwVzLKj87fP4kRVFXHD_FdKGmgYk0',
  });
  vi.mocked(notificationsApi.listDevices).mockResolvedValue(devices);
  vi.mocked(notificationsApi.getPreferences).mockResolvedValue({ preferences });
  vi.mocked(notificationsApi.subscribe).mockResolvedValue(
    device(1, 'Chrome on Android', ENDPOINT_ID),
  );
  vi.mocked(notificationsApi.unsubscribe).mockResolvedValue(null);
}

const turnOnButton = () => screen.findByRole('button', { name: /turn on notifications/i });

beforeEach(async () => {
  vi.clearAllMocks();
  const { endpointId } = await import('@/lib/pwa/push');
  ENDPOINT_ID = await endpointId(ENDPOINT);
});

afterEach(() => {
  vi.restoreAllMocks();
  window.matchMedia = originals.matchMedia;
  for (const name of ['Notification', 'PushManager'] as const) {
    const original = originals[name];
    if (original) Object.defineProperty(globalThis, name, original);
    else delete (globalThis as Record<string, unknown>)[name];
  }
});

describe('NotificationsCard: asking permission', () => {
  it('never asks on page load, only shows the button', async () => {
    setBrowser();
    serverReady();

    render(<NotificationsCard />);

    expect(await turnOnButton()).toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
    expect(notificationsApi.subscribe).not.toHaveBeenCalled();
  });

  it('asks only after the tap, then subscribes and tells the server', async () => {
    setBrowser();
    serverReady({ devices: [] });
    const user = userEvent.setup();
    render(<NotificationsCard />);

    await user.click(await turnOnButton());

    expect(requestPermission).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(notificationsApi.subscribe).toHaveBeenCalledTimes(1));
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(notificationsApi.subscribe).toHaveBeenCalledWith({
      endpoint: ENDPOINT,
      keys: { p256dh: 'P256', auth: 'AUTH' },
    });
  });

  it('moves to the "on" view once the server lists this device', async () => {
    setBrowser();
    serverReady();
    const user = userEvent.setup();
    render(<NotificationsCard />);
    vi.mocked(notificationsApi.listDevices).mockResolvedValue([
      device(1, 'Chrome on Android', ENDPOINT_ID),
    ]);

    await user.click(await turnOnButton());

    expect(await screen.findByText(/notifications are on for this device/i)).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Notifications are on for this device');
  });

  it('shows the "blocked" help when the student says no', async () => {
    setBrowser({ promptAnswer: 'denied' });
    serverReady();
    const user = userEvent.setup();
    render(<NotificationsCard />);

    await user.click(await turnOnButton());

    expect(await screen.findByText(/blocked for this site/i)).toBeInTheDocument();
    expect(notificationsApi.subscribe).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the button when the prompt is closed without an answer', async () => {
    setBrowser({ promptAnswer: 'default' });
    serverReady();
    const user = userEvent.setup();
    render(<NotificationsCard />);

    await user.click(await turnOnButton());

    await waitFor(() => expect(toast.message).toHaveBeenCalled());
    expect(await turnOnButton()).toBeEnabled();
    expect(notificationsApi.subscribe).not.toHaveBeenCalled();
  });

  it('says so when the server refuses the device', async () => {
    setBrowser();
    serverReady();
    vi.mocked(notificationsApi.subscribe).mockRejectedValue(
      new ApiError('INVALID_PUSH_SUBSCRIPTION', 'That is not a push address we can use.'),
    );
    const user = userEvent.setup();
    render(<NotificationsCard />);

    await user.click(await turnOnButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('That is not a push address we can use.'),
    );
    expect(await turnOnButton()).toBeInTheDocument();
  });

  it('already blocked in the browser: explains instead of showing a button that cannot work', async () => {
    setBrowser({ permission: 'denied' });
    serverReady();

    render(<NotificationsCard />);

    expect(await screen.findByText(/blocked for this site/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).not.toBeInTheDocument();
  });
});

describe('NotificationsCard: iPhone', () => {
  it('explains that the app must be on the Home Screen first, with the steps, and offers no button', async () => {
    setBrowser({ userAgent: IPHONE, without: ['PushManager', 'Notification'] });
    serverReady();

    render(<NotificationsCard />);

    expect(await screen.findByText(/once 3D Western is on your Home Screen/i)).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
    expect(screen.getByText(/bottom of Safari/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).not.toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('gives the Chrome-on-iPhone version of the first step', async () => {
    setBrowser({ userAgent: IPHONE_CHROME, without: ['PushManager', 'Notification'] });
    serverReady();

    render(<NotificationsCard />);

    expect(
      await screen.findByText(/next to the address bar at the top of Chrome/i),
    ).toBeInTheDocument();
  });

  it('offers the button once the app runs from the Home Screen', async () => {
    setBrowser({ userAgent: IPHONE, standalone: true });
    serverReady();

    render(<NotificationsCard />);

    expect(await turnOnButton()).toBeInTheDocument();
    expect(screen.queryByText(/once 3D Western is on your Home Screen/i)).not.toBeInTheDocument();
  });

  it('sends a Teams or Instagram browser to Safari', async () => {
    setBrowser({ userAgent: IPHONE_TEAMS, without: ['PushManager', 'Notification'] });
    serverReady();

    render(<NotificationsCard />);

    expect(await screen.findByText(/inside another app/i)).toBeInTheDocument();
    expect(screen.getByText('Open in Safari')).toBeInTheDocument();
  });
});

describe('NotificationsCard: other states', () => {
  it('says notifications are not available yet when the server has no keys', async () => {
    setBrowser();
    vi.mocked(notificationsApi.getConfig).mockResolvedValue({ enabled: false, publicKey: null });

    render(<NotificationsCard />);

    expect(await screen.findByText(/not available yet/i)).toBeInTheDocument();
    expect(notificationsApi.listDevices).not.toHaveBeenCalled();
  });

  it('says so when the browser cannot do push', async () => {
    setBrowser({ without: ['PushManager'] });
    serverReady();

    render(<NotificationsCard />);

    expect(await screen.findByText(/can't show notifications/i)).toBeInTheDocument();
  });

  it('says so when there is no service worker to receive pushes (development)', async () => {
    setBrowser({ registration: false });
    serverReady();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<NotificationsCard />);
    await vi.advanceTimersByTimeAsync(5000);

    expect(await screen.findByText(/can't show notifications/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('offers a retry when the settings cannot be loaded', async () => {
    setBrowser();
    serverReady();
    vi.mocked(notificationsApi.getConfig).mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    render(<NotificationsCard />);

    expect(
      await screen.findByText(/unable to load your notification settings/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await turnOnButton()).toBeInTheDocument();
  });

  it('always says that password changes and login codes stay on email', async () => {
    setBrowser();
    serverReady();

    render(<NotificationsCard />);

    expect(await screen.findByText(/always come by email/i)).toBeInTheDocument();
  });

  it('shows "off" when the browser holds a subscription the server no longer knows (after signing out)', async () => {
    setBrowser({ subscribed: true });
    serverReady({ devices: [] });

    render(<NotificationsCard />);

    expect(await turnOnButton()).toBeInTheDocument();
  });
});

describe('NotificationsCard: when on', () => {
  async function renderOn(overrides: Parameters<typeof serverReady>[0] = {}) {
    setBrowser({ subscribed: true });
    serverReady({ devices: [device(1, 'Chrome on Android', ENDPOINT_ID)], ...overrides });
    const user = userEvent.setup();
    render(<NotificationsCard />);
    await screen.findByText(/notifications are on for this device/i);
    return user;
  }

  it('lists every type with its description, all ticked by default', async () => {
    await renderOn();

    for (const name of ['Training reminders', 'Sign-off results', 'Print updates']) {
      expect(screen.getByRole('checkbox', { name: new RegExp(name, 'i') })).toBeChecked();
    }
    expect(screen.getByText(/a supervisor approved your training/i)).toBeInTheDocument();
  });

  it('shows a type the student switched off as unticked', async () => {
    await renderOn({ preferences: prefs({ PRINT_JOBS: false }) });

    expect(screen.getByRole('checkbox', { name: /print updates/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /training reminders/i })).toBeChecked();
  });

  it('saves a toggle as soon as it is tapped and sends only that type', async () => {
    const user = await renderOn();
    vi.mocked(notificationsApi.updatePreferences).mockResolvedValue({
      preferences: prefs({ SIGNOFF_RESULTS: false }),
    });

    await user.click(screen.getByRole('checkbox', { name: /sign-off results/i }));

    expect(notificationsApi.updatePreferences).toHaveBeenCalledWith({ SIGNOFF_RESULTS: false });
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: /sign-off results/i })).not.toBeChecked(),
    );
    expect(screen.getByRole('checkbox', { name: /training reminders/i })).toBeChecked();
  });

  it('turns a type back on', async () => {
    const user = await renderOn({ preferences: prefs({ PRINT_JOBS: false }) });
    vi.mocked(notificationsApi.updatePreferences).mockResolvedValue({ preferences: prefs() });

    await user.click(screen.getByRole('checkbox', { name: /print updates/i }));

    expect(notificationsApi.updatePreferences).toHaveBeenCalledWith({ PRINT_JOBS: true });
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: /print updates/i })).toBeChecked(),
    );
  });

  it('puts the toggle back and says so when saving fails', async () => {
    const user = await renderOn();
    vi.mocked(notificationsApi.updatePreferences).mockRejectedValue(new Error('offline'));

    await user.click(screen.getByRole('checkbox', { name: /print updates/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole('checkbox', { name: /print updates/i })).toBeChecked();
  });

  it('sends a test notification and says it was sent', async () => {
    const user = await renderOn();
    vi.mocked(notificationsApi.sendTest).mockResolvedValue({ sent: 1, removed: 0, failed: 0 });

    await user.click(screen.getByRole('button', { name: /send a test notification/i }));

    expect(notificationsApi.sendTest).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/test sent/i)),
    );
  });

  it('says when the test could not be delivered', async () => {
    const user = await renderOn();
    vi.mocked(notificationsApi.sendTest).mockResolvedValue({ sent: 0, removed: 0, failed: 1 });

    await user.click(screen.getByRole('button', { name: /send a test notification/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/could not be delivered/i)),
    );
  });

  it('shows the server’s message when a test is sent too soon', async () => {
    const user = await renderOn();
    vi.mocked(notificationsApi.sendTest).mockRejectedValue(
      new ApiError('PUSH_TEST_TOO_SOON', 'Wait a few seconds before sending another test.'),
    );

    await user.click(screen.getByRole('button', { name: /send a test notification/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Wait a few seconds before sending another test.'),
    );
  });

  it('turns notifications off on this device', async () => {
    const user = await renderOn();
    vi.mocked(notificationsApi.listDevices).mockResolvedValue([]);

    await user.click(screen.getByRole('button', { name: /turn off on this device/i }));

    await waitFor(() => expect(notificationsApi.unsubscribe).toHaveBeenCalledWith(ENDPOINT));
    expect(unsubscribe).toHaveBeenCalled();
    expect(await turnOnButton()).toBeInTheDocument();
  });

  it('lists the other devices, and removes one without touching this device', async () => {
    const user = await renderOn({
      devices: [
        device(1, 'Chrome on Android', ENDPOINT_ID),
        device(2, 'Safari on iPhone', 'someone-elses-hash'),
      ],
    });
    vi.mocked(notificationsApi.removeDevice).mockResolvedValue(null);
    vi.mocked(notificationsApi.listDevices).mockResolvedValue([
      device(1, 'Chrome on Android', ENDPOINT_ID),
    ]);

    expect(screen.getByText('Your other devices')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /remove chrome on android/i }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove safari on iphone/i }));

    expect(notificationsApi.removeDevice).toHaveBeenCalledWith(2);
    await waitFor(() => expect(screen.queryByText('Safari on iPhone')).not.toBeInTheDocument());
  });

  it('shows no device list when this is the only device', async () => {
    await renderOn();

    expect(screen.queryByText('Your other devices')).not.toBeInTheDocument();
  });
});
