// Registers the service worker (served by src/app/sw.js/route.ts). Production builds only: in
// development a service worker would hide edits and confuse hot reload.

interface RegisterOptions {
  /** Defaults to the build mode. Passed in by tests. */
  env?: string;
  nav?: Pick<Navigator, 'serviceWorker'> | { serviceWorker?: undefined };
}

export async function registerServiceWorker({
  env = process.env.NODE_ENV,
  nav = typeof navigator === 'undefined' ? {} : navigator,
}: RegisterOptions = {}): Promise<ServiceWorkerRegistration | null> {
  if (env !== 'production' || !nav.serviceWorker) return null;

  try {
    // updateViaCache: 'none' makes the browser fetch sw.js fresh on every check, so a new deploy
    // is noticed straight away (the worker itself never caches app code: see service-worker-source.ts).
    const registration = await nav.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    // Installed apps can stay open for days: look for a new worker whenever the app comes back
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update().catch(() => {});
      });
    }
    return registration;
  } catch (error) {
    console.warn('Service worker registration failed', error);
    return null;
  }
}
