import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationsApi } from '@/api/client/notifications';
import {
  disablePush,
  dropOtherUsersSubscription,
  enablePush,
  endpointId,
  getPushRegistration,
  resolvePushAvailability,
  unsubscribeThisDeviceQuietly,
  urlBase64ToUint8Array,
  type AvailabilityInput,
} from './push';

vi.mock('@/api/client/notifications', () => ({
  notificationsApi: { subscribe: vi.fn(), unsubscribe: vi.fn(), listDevices: vi.fn() },
}));

const capable: AvailabilityInput = {
  serverEnabled: true,
  platform: 'android',
  standalone: false,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  permission: 'default',
};

describe('resolvePushAvailability', () => {
  it('is available on a capable browser that has not been asked yet', () => {
    expect(resolvePushAvailability(capable)).toBe('available');
    expect(resolvePushAvailability({ ...capable, platform: 'desktop' })).toBe('available');
    expect(resolvePushAvailability({ ...capable, permission: 'granted' })).toBe('available');
  });

  it('is off for everyone when the server has no keys', () => {
    expect(resolvePushAvailability({ ...capable, serverEnabled: false })).toBe('server-off');
  });

  it('asks an iPhone or iPad in a browser tab to add the app to the Home Screen first', () => {
    // Safari in a tab has no PushManager at all, so this must win over "unsupported"
    const tab = { ...capable, hasPushManager: false, hasNotification: false };
    expect(resolvePushAvailability({ ...tab, platform: 'ios' })).toBe('needs-install');
    expect(resolvePushAvailability({ ...tab, platform: 'ios-chrome' })).toBe('needs-install');
  });

  it('is available on an iPhone once the app is on the Home Screen', () => {
    expect(resolvePushAvailability({ ...capable, platform: 'ios', standalone: true })).toBe(
      'available',
    );
  });

  it('sends people in another app’s browser to the real browser', () => {
    expect(resolvePushAvailability({ ...capable, platform: 'ios-webview' })).toBe(
      'open-in-browser',
    );
    expect(resolvePushAvailability({ ...capable, platform: 'android-webview' })).toBe(
      'open-in-browser',
    );
  });

  it.each([
    ['no service worker', { hasServiceWorker: false }],
    ['no push manager', { hasPushManager: false }],
    ['no Notification API', { hasNotification: false }],
  ])('is unsupported with %s', (_name, change) => {
    expect(resolvePushAvailability({ ...capable, ...change })).toBe('unsupported');
  });

  it('is blocked once the student has said no', () => {
    expect(resolvePushAvailability({ ...capable, permission: 'denied' })).toBe('blocked');
  });
});

describe('urlBase64ToUint8Array', () => {
  it('decodes base64url without padding', () => {
    // "hello?>" is "aGVsbG8_Pg" in base64url (uses _ for the '?' bits) and needs two '=' of padding
    expect(Array.from(urlBase64ToUint8Array('aGVsbG8_Pg'))).toEqual(
      Array.from(new TextEncoder().encode('hello?>')),
    );
  });

  it('turns a 65-byte uncompressed key into 65 bytes', () => {
    const key =
      'BDWSbKPR_UPC_Ix0kQrxwNefe1J23oDgu8xJFhudbQwEov9T9_3m5bFmvcQwVzLKj87fP4kRVFXHD_FdKGmgYk0';
    const bytes = urlBase64ToUint8Array(key);
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(4);
  });
});

describe('endpointId', () => {
  it('is the lowercase hex SHA-256, the same id the server computes', async () => {
    // Same vector as the server side: SHA-256("abc")
    expect(await endpointId('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

// ---- turning notifications on and off ----

function fakeSubscription(endpoint = 'https://fcm.googleapis.com/fcm/send/abc') {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'P256', auth: 'AUTH' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  };
}

function fakeRegistration(subscription = fakeSubscription()) {
  return {
    pushManager: {
      subscribe: vi.fn().mockResolvedValue(subscription),
      getSubscription: vi.fn().mockResolvedValue(subscription),
    },
  } as unknown as ServiceWorkerRegistration & {
    pushManager: { subscribe: ReturnType<typeof vi.fn>; getSubscription: ReturnType<typeof vi.fn> };
  };
}

const realNotification = globalThis.Notification;
function setPermissionPrompt(result: NotificationPermission) {
  const requestPermission = vi.fn().mockResolvedValue(result);
  Object.defineProperty(globalThis, 'Notification', {
    value: { requestPermission, permission: 'default' },
    configurable: true,
    writable: true,
  });
  return requestPermission;
}

describe('enablePush', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    Object.defineProperty(globalThis, 'Notification', {
      value: realNotification,
      configurable: true,
      writable: true,
    });
  });

  it('asks for permission first, then subscribes with the server key and tells the server', async () => {
    const order: string[] = [];
    const requestPermission = setPermissionPrompt('granted');
    requestPermission.mockImplementation(async () => {
      order.push('permission');
      return 'granted';
    });
    const registration = fakeRegistration();
    registration.pushManager.subscribe.mockImplementation(async () => {
      order.push('subscribe');
      return fakeSubscription();
    });
    vi.mocked(notificationsApi.subscribe).mockImplementation(async () => {
      order.push('server');
      return {} as never;
    });

    const result = await enablePush(
      registration,
      'BDWSbKPR_UPC_Ix0kQrxwNefe1J23oDgu8xJFhudbQwEov9T9_3m5bFmvcQwVzLKj87fP4kRVFXHD_FdKGmgYk0',
    );

    expect(result).toEqual({ ok: true });
    expect(order).toEqual(['permission', 'subscribe', 'server']);
    const options = registration.pushManager.subscribe.mock.calls[0][0];
    expect(options.userVisibleOnly).toBe(true);
    expect(options.applicationServerKey).toHaveLength(65);
    expect(notificationsApi.subscribe).toHaveBeenCalledWith({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'P256', auth: 'AUTH' },
    });
  });

  it('does nothing more when the student says no', async () => {
    setPermissionPrompt('denied');
    const registration = fakeRegistration();

    expect(await enablePush(registration, 'key')).toEqual({ ok: false, reason: 'denied' });
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
    expect(notificationsApi.subscribe).not.toHaveBeenCalled();
  });

  it('treats closing the prompt as "not now"', async () => {
    setPermissionPrompt('default');
    const registration = fakeRegistration();

    expect(await enablePush(registration, 'key')).toEqual({ ok: false, reason: 'dismissed' });
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('replaces an old subscription made with a different server key, then subscribes again', async () => {
    setPermissionPrompt('granted');
    const registration = fakeRegistration();
    const old = fakeSubscription('https://fcm.googleapis.com/fcm/send/old');
    registration.pushManager.getSubscription.mockResolvedValue(old);
    registration.pushManager.subscribe
      .mockRejectedValueOnce(new DOMException('different key', 'InvalidStateError'))
      .mockResolvedValueOnce(fakeSubscription());
    vi.mocked(notificationsApi.subscribe).mockResolvedValue({} as never);

    expect(await enablePush(registration, 'key')).toEqual({ ok: true });
    expect(old.unsubscribe).toHaveBeenCalled();
    expect(registration.pushManager.subscribe).toHaveBeenCalledTimes(2);
  });

  it('reports a failure when the browser cannot subscribe or the server refuses', async () => {
    setPermissionPrompt('granted');
    const registration = fakeRegistration();
    registration.pushManager.subscribe.mockRejectedValue(new Error('push service unreachable'));
    expect(await enablePush(registration, 'key')).toMatchObject({ ok: false, reason: 'failed' });

    registration.pushManager.subscribe.mockResolvedValue(fakeSubscription());
    vi.mocked(notificationsApi.subscribe).mockRejectedValue(new Error('400'));
    expect(await enablePush(registration, 'key')).toMatchObject({ ok: false, reason: 'failed' });
  });

  it('refuses a subscription that has no keys', async () => {
    setPermissionPrompt('granted');
    const registration = fakeRegistration({
      ...fakeSubscription(),
      toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/x' }),
    } as unknown as ReturnType<typeof fakeSubscription>);

    expect(await enablePush(registration, 'key')).toMatchObject({ ok: false, reason: 'failed' });
    expect(notificationsApi.subscribe).not.toHaveBeenCalled();
  });
});

describe('disablePush', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forgets the browser subscription and tells the server its address', async () => {
    const subscription = fakeSubscription('https://fcm.googleapis.com/fcm/send/mine');
    vi.mocked(notificationsApi.unsubscribe).mockResolvedValue(null);

    await disablePush(fakeRegistration(subscription));

    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(notificationsApi.unsubscribe).toHaveBeenCalledWith(
      'https://fcm.googleapis.com/fcm/send/mine',
    );
  });

  it('does nothing when this device has no subscription', async () => {
    const registration = fakeRegistration();
    registration.pushManager.getSubscription.mockResolvedValue(null);

    await disablePush(registration);

    expect(notificationsApi.unsubscribe).not.toHaveBeenCalled();
  });

  it('still tells the server when the browser fails to forget the subscription', async () => {
    const subscription = fakeSubscription();
    subscription.unsubscribe.mockRejectedValue(new Error('nope'));
    vi.mocked(notificationsApi.unsubscribe).mockResolvedValue(null);

    await disablePush(fakeRegistration(subscription));

    expect(notificationsApi.unsubscribe).toHaveBeenCalled();
  });
});

describe('unsubscribeThisDeviceQuietly (sign-out)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does nothing in a browser without a service worker', async () => {
    await expect(unsubscribeThisDeviceQuietly({})).resolves.toBeUndefined();
  });

  it('turns push off for this device', async () => {
    const subscription = fakeSubscription();
    vi.mocked(notificationsApi.unsubscribe).mockResolvedValue(null);
    const nav = {
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue(fakeRegistration(subscription)) },
    } as unknown as Navigator;

    await unsubscribeThisDeviceQuietly(nav);

    expect(notificationsApi.unsubscribe).toHaveBeenCalledWith(subscription.endpoint);
  });

  it('never throws, whatever goes wrong', async () => {
    vi.mocked(notificationsApi.unsubscribe).mockRejectedValue(new Error('offline'));
    const nav = {
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue(fakeRegistration()) },
    } as unknown as Navigator;

    await expect(unsubscribeThisDeviceQuietly(nav)).resolves.toBeUndefined();
  });

  it('does not hold up signing out for more than the time limit', async () => {
    const nav = {
      serviceWorker: { getRegistration: vi.fn().mockReturnValue(new Promise(() => {})) },
    } as unknown as Navigator;

    const started = Date.now();
    await unsubscribeThisDeviceQuietly(nav, 30);

    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe('dropOtherUsersSubscription (after sign-in)', () => {
  beforeEach(() => vi.clearAllMocks());

  const navWith = (registration: unknown) =>
    ({
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue(registration) },
    }) as unknown as Navigator;

  const device = (endpointIdValue: string) => ({
    id: 1,
    label: 'x',
    endpointId: endpointIdValue,
    createdAt: '2026-10-20T12:00:00Z',
    lastSuccessAt: null,
  });

  it('forgets a subscription that is not on my list, and tells the server', async () => {
    const subscription = fakeSubscription('https://fcm.googleapis.com/fcm/send/previous-person');
    vi.mocked(notificationsApi.listDevices).mockResolvedValue([device('some-other-hash')]);
    vi.mocked(notificationsApi.unsubscribe).mockResolvedValue(null);

    await dropOtherUsersSubscription(navWith(fakeRegistration(subscription)));

    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(notificationsApi.unsubscribe).toHaveBeenCalledWith(
      'https://fcm.googleapis.com/fcm/send/previous-person',
    );
  });

  it('keeps a subscription that is mine', async () => {
    const subscription = fakeSubscription();
    vi.mocked(notificationsApi.listDevices).mockResolvedValue([
      device(await endpointId(subscription.endpoint)),
    ]);

    await dropOtherUsersSubscription(navWith(fakeRegistration(subscription)));

    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(notificationsApi.unsubscribe).not.toHaveBeenCalled();
  });

  it('makes no request at all when the browser has no subscription', async () => {
    const registration = fakeRegistration();
    registration.pushManager.getSubscription.mockResolvedValue(null);

    await dropOtherUsersSubscription(navWith(registration));

    expect(notificationsApi.listDevices).not.toHaveBeenCalled();
  });

  it('does nothing without a service worker or a registration', async () => {
    await expect(dropOtherUsersSubscription({})).resolves.toBeUndefined();
    await expect(dropOtherUsersSubscription(navWith(undefined))).resolves.toBeUndefined();
    expect(notificationsApi.listDevices).not.toHaveBeenCalled();
  });

  it('never throws, and gives up after the time limit', async () => {
    vi.mocked(notificationsApi.listDevices).mockRejectedValue(new Error('offline'));
    await expect(dropOtherUsersSubscription(navWith(fakeRegistration()))).resolves.toBeUndefined();

    vi.mocked(notificationsApi.listDevices).mockReturnValue(new Promise(() => {}));
    const started = Date.now();
    await dropOtherUsersSubscription(navWith(fakeRegistration()), 30);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe('getPushRegistration', () => {
  it('is null without a service worker', async () => {
    expect(await getPushRegistration({} as Navigator)).toBeNull();
  });

  it('returns the registration that exists', async () => {
    const registration = {} as ServiceWorkerRegistration;
    const nav = { serviceWorker: { getRegistration: vi.fn().mockResolvedValue(registration) } };

    expect(await getPushRegistration(nav as unknown as Navigator)).toBe(registration);
  });

  it('waits for the worker that is still registering', async () => {
    const registration = {} as ServiceWorkerRegistration;
    const nav = {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue(undefined),
        ready: Promise.resolve(registration),
      },
    };

    expect(await getPushRegistration(nav as unknown as Navigator)).toBe(registration);
  });

  it('gives up when no worker ever comes (development)', async () => {
    const nav = {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue(undefined),
        ready: new Promise(() => {}),
      },
    };

    expect(await getPushRegistration(nav as unknown as Navigator, 20)).toBeNull();
  });
});
