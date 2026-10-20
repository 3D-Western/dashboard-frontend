export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.MOCK_ENABLED === 'true') {
    // Route through the same guarded initializer apiRequest() uses, instead of calling
    // mockServer.listen() independently - two unguarded listen() calls race on dev-server
    // HMR reloads and can leave server-side fetches unintercepted (real network calls to
    // API_URL instead of the mock handlers).
    const { ensureMockServer } = await import('@/api/client/mock-server');
    await ensureMockServer();
    console.log('Mock server started');
  }
}
