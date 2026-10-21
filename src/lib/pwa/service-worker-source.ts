// The service worker's code, as a string served at /sw.js (src/app/sw.js/route.ts).
//
// It is deliberately minimal. Its jobs: make the dashboard installable, show a friendly page when
// the phone has no signal, and (later) receive web push. It does NOT cache anything:
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
