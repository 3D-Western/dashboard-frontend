import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ensureMockServer', () => {
  const originalWindow = global.window;
  const originalEnv = process.env.MOCK_ENABLED;
  const originalFetch = globalThis.fetch;

  let mockServerListen: ReturnType<typeof vi.fn>;
  let ensureMockServer: () => Promise<void>;

  beforeEach(async () => {
    mockServerListen = vi.fn();

    vi.doMock('@/api/mocks', () => ({
      mockServer: {
        listen: mockServerListen,
      },
    }));

    delete (global as unknown as { window?: unknown }).window;
    globalThis.__mswServerStarted = undefined;
    globalThis.__mswFetch = undefined;

    const importedModule = await import('./mock-server');
    ensureMockServer = importedModule.ensureMockServer;
  });

  afterEach(() => {
    vi.doUnmock('@/api/mocks');
    if (originalWindow !== undefined) {
      global.window = originalWindow;
    } else {
      delete (global as unknown as { window?: unknown }).window;
    }
    process.env.MOCK_ENABLED = originalEnv;
    globalThis.fetch = originalFetch;
    globalThis.__mswServerStarted = undefined;
    globalThis.__mswFetch = undefined;
  });

  describe('early returns', () => {
    it('returns early when running in browser (window is defined)', async () => {
      (global as unknown as { window: object }).window = {} as Window & typeof globalThis;
      process.env.MOCK_ENABLED = 'true';

      await ensureMockServer();

      expect(mockServerListen).not.toHaveBeenCalled();
    });

    it('returns early when MOCK_ENABLED is not "true"', async () => {
      process.env.MOCK_ENABLED = 'false';

      await ensureMockServer();

      expect(mockServerListen).not.toHaveBeenCalled();
    });

    it('returns early when MOCK_ENABLED is undefined', async () => {
      delete process.env.MOCK_ENABLED;

      await ensureMockServer();

      expect(mockServerListen).not.toHaveBeenCalled();
    });

    it('returns early when MOCK_ENABLED is an empty string', async () => {
      process.env.MOCK_ENABLED = '';

      await ensureMockServer();

      expect(mockServerListen).not.toHaveBeenCalled();
    });
  });

  describe('server initialization', () => {
    it('initializes mock server on first call when conditions are met', async () => {
      process.env.MOCK_ENABLED = 'true';

      await ensureMockServer();

      expect(mockServerListen).toHaveBeenCalledTimes(1);
      expect(globalThis.__mswServerStarted).toBe(true);
      expect(globalThis.__mswFetch).toBe(originalFetch);
    });

    it('sets global variables after initialization', async () => {
      process.env.MOCK_ENABLED = 'true';

      expect(globalThis.__mswServerStarted).toBeUndefined();
      expect(globalThis.__mswFetch).toBeUndefined();

      await ensureMockServer();

      expect(globalThis.__mswServerStarted).toBe(true);
      expect(globalThis.__mswFetch).toBe(globalThis.fetch);
    });
  });

  describe('HMR (Hot Module Replacement) scenarios', () => {
    it('does not re-initialize when server is already started and fetch has not changed', async () => {
      process.env.MOCK_ENABLED = 'true';

      await ensureMockServer();
      expect(mockServerListen).toHaveBeenCalledTimes(1);

      await ensureMockServer();
      await ensureMockServer();

      expect(mockServerListen).toHaveBeenCalledTimes(1);
    });

    it('re-initializes when fetch reference has changed (HMR reload)', async () => {
      process.env.MOCK_ENABLED = 'true';

      await ensureMockServer();
      expect(mockServerListen).toHaveBeenCalledTimes(1);

      const newFetch = vi.fn() as unknown as typeof fetch;
      globalThis.fetch = newFetch;

      await ensureMockServer();

      expect(mockServerListen).toHaveBeenCalledTimes(2);
      expect(globalThis.__mswFetch).toBe(newFetch);
    });

    it('re-initializes when __mswServerStarted is false', async () => {
      process.env.MOCK_ENABLED = 'true';

      globalThis.__mswServerStarted = false;
      globalThis.__mswFetch = originalFetch;

      await ensureMockServer();

      expect(mockServerListen).toHaveBeenCalledTimes(1);
      expect(globalThis.__mswServerStarted).toBe(true);
    });

    it('re-initializes when __mswServerStarted is undefined', async () => {
      process.env.MOCK_ENABLED = 'true';

      globalThis.__mswServerStarted = undefined;
      globalThis.__mswFetch = originalFetch;

      await ensureMockServer();

      expect(mockServerListen).toHaveBeenCalledTimes(1);
      expect(globalThis.__mswServerStarted).toBe(true);
    });
  });

  describe('concurrent calls', () => {
    it('handles concurrent calls during initialization', async () => {
      process.env.MOCK_ENABLED = 'true';

      await Promise.all([ensureMockServer(), ensureMockServer(), ensureMockServer()]);

      expect(mockServerListen.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(globalThis.__mswServerStarted).toBe(true);
      expect(globalThis.__mswFetch).toBe(globalThis.fetch);
    });
  });

  describe('edge cases', () => {
    it('handles case where only __mswServerStarted is set but __mswFetch is undefined', async () => {
      process.env.MOCK_ENABLED = 'true';

      globalThis.__mswServerStarted = true;
      globalThis.__mswFetch = undefined;

      await ensureMockServer();

      expect(mockServerListen).toHaveBeenCalledTimes(1);
      expect(globalThis.__mswFetch).toBe(globalThis.fetch);
    });

    it('handles case where only __mswFetch is set but __mswServerStarted is undefined', async () => {
      process.env.MOCK_ENABLED = 'true';

      globalThis.__mswServerStarted = undefined;
      globalThis.__mswFetch = originalFetch;

      await ensureMockServer();

      expect(mockServerListen).toHaveBeenCalledTimes(1);
      expect(globalThis.__mswServerStarted).toBe(true);
    });

    it('correctly identifies fetch change even when __mswServerStarted is true', async () => {
      process.env.MOCK_ENABLED = 'true';

      globalThis.__mswServerStarted = true;
      const oldFetch = vi.fn() as unknown as typeof fetch;
      globalThis.__mswFetch = oldFetch;

      const newFetch = vi.fn() as unknown as typeof fetch;
      globalThis.fetch = newFetch;

      await ensureMockServer();

      expect(mockServerListen).toHaveBeenCalledTimes(1);
      expect(globalThis.__mswFetch).toBe(newFetch);
    });
  });

  describe('default export', () => {
    it('exports ensureMockServer as default', async () => {
      const importedModule = await import('./mock-server');
      expect(importedModule.default).toBe(importedModule.ensureMockServer);
    });
  });
});
