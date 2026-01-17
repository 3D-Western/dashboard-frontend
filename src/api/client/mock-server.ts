declare global {
  // Persist these vars on the global object across HMR reloads in Node
  var __mswServerStarted: boolean | undefined;
  var __mswFetch: typeof fetch | undefined;
}

/**
 * Initialize Mock Service Worker for server-side environments when enabled.
 * This is intentionally separated from the API client to decouple implementation details.
 */
export async function ensureMockServer(): Promise<void> {
  if (typeof window !== 'undefined') return; // only run on server
  if (process.env.MOCK_ENABLED !== 'true') return; // opt-in via env

  const currentFetch = globalThis.fetch;

  if (!globalThis.__mswServerStarted || globalThis.__mswFetch !== currentFetch) {
    const { mockServer } = await import('@/api/mocks');
    mockServer.listen();
    globalThis.__mswServerStarted = true;
    globalThis.__mswFetch = currentFetch;
  }
}

export default ensureMockServer;
