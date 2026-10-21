import { describe, it, expect, vi } from 'vitest';
import vm from 'node:vm';
import { buildServiceWorkerSource } from './service-worker-source';

type Handler = (event: unknown) => void;

/** Runs the worker's code against a fake worker scope, so its behaviour can be checked. */
function loadWorker(fetchImpl: (req: unknown) => Promise<unknown> = vi.fn()) {
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
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
  };
  vm.runInNewContext(buildServiceWorkerSource('abc123'), {
    self,
    caches,
    fetch: fetchImpl,
    Response,
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
