import { describe, it, expect, vi } from 'vitest';
import vm from 'node:vm';
import { buildServiceWorkerSource } from './service-worker-source';

type Handler = (event: unknown) => void;

/** Runs the worker's code against a fake worker scope, so its behaviour can be checked. */
function loadWorker(
  fetchImpl: (req: unknown) => Promise<unknown> = vi.fn(),
  { windows = [] as unknown[] }: { windows?: unknown[] } = {},
) {
  const handlers: Record<string, Handler> = {};
  const caches = {
    keys: vi.fn().mockResolvedValue(['old-cache', 'another']),
    delete: vi.fn().mockResolvedValue(true),
    open: vi.fn(),
  };
  const self = {
    addEventListener: (type: string, handler: Handler) => {
      handlers[type] = handler;
    },
    skipWaiting: vi.fn(),
    clients: {
      claim: vi.fn().mockResolvedValue(undefined),
      matchAll: vi.fn().mockResolvedValue(windows),
      openWindow: vi.fn().mockResolvedValue(undefined),
    },
    registration: { showNotification: vi.fn().mockResolvedValue(undefined) },
    location: { origin: 'https://app.test' },
  };
  vm.runInNewContext(buildServiceWorkerSource('abc123'), {
    self,
    caches,
    fetch: fetchImpl,
    Response,
    URL,
  });
  return { handlers, caches, self };
}

const navigation = { mode: 'navigate', method: 'GET', url: 'https://app.test/dashboard' };

describe('service worker', () => {
  it('carries the build version, so each deploy serves different bytes', () => {
    expect(buildServiceWorkerSource('v1')).toContain('"v1"');
    expect(buildServiceWorkerSource('v1')).not.toEqual(buildServiceWorkerSource('v2'));
  });

  it('takes over at once on install', () => {
    const { handlers, self } = loadWorker();
    handlers.install({});
    expect(self.skipWaiting).toHaveBeenCalled();
  });

  it('clears every cache and claims open pages on activate', async () => {
    const { handlers, caches, self } = loadWorker();
    let work: Promise<unknown> = Promise.resolve();
    handlers.activate({ waitUntil: (p: Promise<unknown>) => (work = p) });
    await work;

    expect(caches.delete).toHaveBeenCalledWith('old-cache');
    expect(caches.delete).toHaveBeenCalledWith('another');
    expect(self.clients.claim).toHaveBeenCalled();
  });

  it('never opens a cache: nothing is stored, so nothing can go stale', () => {
    expect(buildServiceWorkerSource('v')).not.toMatch(
      /caches\.(open|put|match)|\.addAll\(|cache\.put/,
    );
  });

  it('shows the offline page when a page load fails', async () => {
    const { handlers } = loadWorker(() => Promise.reject(new TypeError('Failed to fetch')));
    let response: Promise<Response> | undefined;
    handlers.fetch({ request: navigation, respondWith: (p: Promise<Response>) => (response = p) });

    const res = await response!;
    expect(res.status).toBe(503);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain("You're offline");
  });

  it('passes a page load through to the network when online', async () => {
    const live = new Response('live page');
    const { handlers } = loadWorker(() => Promise.resolve(live));
    let response: Promise<Response> | undefined;
    handlers.fetch({ request: navigation, respondWith: (p: Promise<Response>) => (response = p) });

    expect(await response!).toBe(live);
  });

  it.each([
    ['an API call', { mode: 'cors', method: 'GET', url: 'https://app.test/api/v1/jobs' }],
    ['a script', { mode: 'no-cors', method: 'GET', url: 'https://app.test/_next/static/a.js' }],
    ['a form post', { mode: 'navigate', method: 'POST', url: 'https://app.test/login' }],
  ])('leaves %s alone (no respondWith, so the browser handles it)', (_name, request) => {
    const { handlers } = loadWorker();
    const respondWith = vi.fn();
    handlers.fetch({ request, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
});

// ---- Web push ----

type PushEventLike = {
  data: { json: () => unknown } | null;
  waitUntil: (p: Promise<unknown>) => void;
};

/** Delivers a push to the worker and returns what it showed. */
async function receivePush(body: unknown | 'unreadable' | null) {
  const { handlers, self } = loadWorker();
  const data =
    body === null
      ? null
      : {
          json: () => {
            if (body === 'unreadable') throw new SyntaxError('Unexpected token');
            return body;
          },
        };
  let work: Promise<unknown> = Promise.resolve();
  const event: PushEventLike = { data, waitUntil: (p) => (work = p) };
  handlers.push(event);
  await work;
  return self.registration.showNotification;
}

const goodPush = {
  v: 1,
  type: 'TRAINING_REMINDERS',
  title: 'Laser Cutter: 7 days left',
  body: 'Finish the quick update by November 20 to keep your access.',
  url: '/dashboard/training',
  tag: 'training-reminder-3',
};

describe('service worker: push', () => {
  it('shows the notification the server sent, with its tag and link', async () => {
    const show = await receivePush(goodPush);

    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith(
      'Laser Cutter: 7 days left',
      expect.objectContaining({
        body: 'Finish the quick update by November 20 to keep your access.',
        tag: 'training-reminder-3',
        icon: '/icons/icon-192.png',
        data: { url: '/dashboard/training' },
      }),
    );
  });

  it('keeps the push alive until the notification is shown', async () => {
    const { handlers } = loadWorker();
    const waitUntil = vi.fn();
    handlers.push({ data: { json: () => goodPush }, waitUntil });
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no body', null],
    ['an unreadable body', 'unreadable'],
    ['a payload version it does not know', { ...goodPush, v: 2 }],
    ['something that is not an object', 'just text'],
  ])('still shows a generic notification for %s (browsers require one)', async (_name, body) => {
    const show = await receivePush(body);

    expect(show).toHaveBeenCalledWith(
      '3D Western',
      expect.objectContaining({
        body: 'You have a new notification.',
        data: { url: '/dashboard' },
      }),
    );
  });

  it('fills in a missing title or body and cuts very long text', async () => {
    const show = await receivePush({
      v: 1,
      title: '   ',
      body: 'x'.repeat(500),
      url: '/dashboard',
    });

    const [title, options] = vi.mocked(show).mock.calls[0];
    expect(title).toBe('3D Western');
    expect(options.body).toHaveLength(200);
    expect(options.tag).toBe('general');
  });

  it.each([
    ['another site', 'https://evil.example.com/phish'],
    ['a protocol-relative link', '//evil.example.com'],
    ['a backslash trick', '/\\evil.example.com'],
    ['a script', 'javascript:alert(1)'],
    ['a relative path', 'dashboard/training'],
    ['a number', 42],
  ])('never links to %s', async (_name, url) => {
    const show = await receivePush({ ...goodPush, url });

    expect(vi.mocked(show).mock.calls[0][1].data).toEqual({ url: '/dashboard' });
  });
});

describe('service worker: tapping a notification', () => {
  function tap(url: string | undefined, windows: unknown[] = []) {
    const loaded = loadWorker(vi.fn(), { windows });
    const close = vi.fn();
    let work: Promise<unknown> = Promise.resolve();
    loaded.handlers.notificationclick({
      notification: { close, data: url === undefined ? undefined : { url } },
      waitUntil: (p: Promise<unknown>) => (work = p),
    });
    return { ...loaded, close, done: () => work };
  }

  const openWindow = (overrides: Record<string, unknown> = {}) => ({
    url: 'https://app.test/dashboard/jobs',
    focus: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  it('closes the notification and opens the link when the app is not open', async () => {
    const { self, close, done } = tap('/dashboard/training');
    await done();

    expect(close).toHaveBeenCalled();
    expect(self.clients.openWindow).toHaveBeenCalledWith('https://app.test/dashboard/training');
  });

  it('focuses a window that is already open and takes it to the link', async () => {
    const window = openWindow();
    const { self, done } = tap('/dashboard/training', [window]);
    await done();

    expect(window.focus).toHaveBeenCalled();
    expect(window.navigate).toHaveBeenCalledWith('https://app.test/dashboard/training');
    expect(self.clients.openWindow).not.toHaveBeenCalled();
  });

  it('ignores windows of other sites', async () => {
    const other = openWindow({ url: 'https://elsewhere.test/' });
    const { self, done } = tap('/dashboard/training', [other]);
    await done();

    expect(other.focus).not.toHaveBeenCalled();
    expect(self.clients.openWindow).toHaveBeenCalled();
  });

  it('opens a new window when the open one cannot be reused', async () => {
    const stubborn = openWindow({
      navigate: vi.fn().mockRejectedValue(new TypeError('not allowed')),
    });
    const { self, done } = tap('/dashboard/training', [stubborn]);
    await done();

    expect(self.clients.openWindow).toHaveBeenCalledWith('https://app.test/dashboard/training');
  });

  it('goes to the dashboard when the notification carries no link or an unsafe one', async () => {
    for (const url of [undefined, 'https://evil.example.com']) {
      const { self, done } = tap(url);
      await done();
      expect(self.clients.openWindow).toHaveBeenCalledWith('https://app.test/dashboard');
    }
  });
});
