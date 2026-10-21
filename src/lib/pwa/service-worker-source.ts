// The service worker's code, as a string served at /sw.js (src/app/sw.js/route.ts).
//
// It is deliberately minimal. Its jobs: make the dashboard installable, show a friendly page when
// the phone has no signal, and show web push notifications (docs/specs/notifications.md). It does
// NOT cache anything:
//  - no API responses and no signed-in pages (they are personal and must always be live),
//  - no app code (JS/CSS), so it can never serve stale code after a deploy.
// The offline page is built into the worker itself rather than cached, so there is nothing that
// can go out of date.
//
// Update path: every deploy changes `VERSION` below, so the browser sees a different sw.js
// (it re-fetches it on each visit, see register-service-worker.ts), installs the new worker,
// `skipWaiting()` makes it take over at once and `clients.claim()` applies it to open pages.
// Because nothing is cached there is nothing to migrate; activate also deletes any cache a
// future or past version created, as a safety net.

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Offline | 3D Western</title>
<style>
  :root { color-scheme: dark light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    background: #0b0d10; color: #e7e4df; text-align: center; }
  main { max-width: 22rem; }
  h1 { font-size: 1.5rem; margin: 0 0 .75rem; }
  p { margin: 0 0 1.5rem; line-height: 1.5; color: #b9b5ae; }
  button { font: inherit; font-weight: 600; min-height: 44px; padding: 0 1.5rem; border: 0;
    border-radius: 999px; background: #a63bdb; color: #fff; cursor: pointer; }
  @media (prefers-color-scheme: light) {
    body { background: #f6f5f8; color: #171717; } p { color: #555; }
  }
</style>
</head>
<body>
<main>
  <h1>You're offline</h1>
  <p>3D Western needs a connection to show your prints and training. Check your signal or Wi-Fi, then try again.</p>
  <button type="button" onclick="location.reload()">Try again</button>
</main>
</body>
</html>`;

export function buildServiceWorkerSource(version: string): string {
  return `// 3D Western service worker. Version: ${JSON.stringify(version)}
// Caches nothing. See src/lib/pwa/service-worker-source.ts for why.
const VERSION = ${JSON.stringify(version)};
const OFFLINE_HTML = ${JSON.stringify(OFFLINE_HTML)};

self.addEventListener('install', () => {
  // Take over from the previous version straight away instead of waiting for every tab to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // We never create caches; remove any that exist so nothing stale can linger
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

// ---- Web push -------------------------------------------------------------------------------
// The server sends a small JSON body, encrypted end to end: { v, type, title, body, url, tag }.
// Browsers require every push to show a notification, so anything we can't understand still shows
// a generic one rather than being dropped (a silent push can get the subscription revoked).
const PUSH_FALLBACK = { title: '3D Western', body: 'You have a new notification.', url: '/dashboard', tag: 'general' };

// A tap may only ever go to a page inside this site: a path, never another site (not //host, nor a backslash after the slash, which browsers treat the same way).
function safePath(value) {
  return typeof value === 'string' && value.charAt(0) === '/' && value.charAt(1) !== '/' && value.charCodeAt(1) !== 92 ? value : PUSH_FALLBACK.url;
}

function text(value, fallback, max) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function readPush(event) {
  let data = null;
  try {
    data = event.data ? event.data.json() : null;
  } catch (error) {
    data = null;
  }
  if (!data || typeof data !== 'object' || data.v !== 1) return PUSH_FALLBACK;
  return {
    title: text(data.title, PUSH_FALLBACK.title, 100),
    body: text(data.body, PUSH_FALLBACK.body, 200),
    url: safePath(data.url),
    tag: text(data.tag, PUSH_FALLBACK.tag, 64),
  };
}

self.addEventListener('push', (event) => {
  const push = readPush(event);
  event.waitUntil(
    self.registration.showNotification(push.title, {
      body: push.body,
      tag: push.tag,
      icon: '/icons/icon-192.png',
      data: { url: push.url },
    }),
  );
});

// Tap: focus the dashboard if it is already open (and take it to the link), otherwise open it.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = safePath(event.notification.data && event.notification.data.url);
  event.waitUntil(
    (async () => {
      const target = new URL(path, self.location.origin).href;
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          await client.focus();
          if (client.navigate) await client.navigate(target);
          return;
        } catch (error) {
          // This window can't be reused (some browsers refuse to navigate it): open a new one below
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Only page navigations, and only to show the offline page when the network fails. Everything
  // else (API calls, scripts, images, POSTs) goes straight to the network, untouched.
  if (request.mode !== 'navigate' || request.method !== 'GET') return;
  event.respondWith(
    fetch(request).catch(
      () =>
        new Response(OFFLINE_HTML, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        }),
    ),
  );
});
`;
}
