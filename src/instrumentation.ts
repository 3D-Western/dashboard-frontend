export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.MOCK_ENABLED === 'true') {
    const { mockServer } = await import('@/api/mocks');
    mockServer.listen();
    console.log('Mock server started');
  }
}
