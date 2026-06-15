import { describe, it, expect, afterEach } from 'vitest';
import { getBaseUrl } from './utils';

describe('getBaseUrl', () => {
  const originalWindow = global.window;
  const originalEnv = process.env.API_URL;

  afterEach(() => {
    // Restore original window
    global.window = originalWindow;
    // Restore original env
    if (originalEnv) {
      process.env.API_URL = originalEnv;
    } else {
      delete process.env.API_URL;
    }
  });

  it('returns empty string on client-side', () => {
    // Ensure window is defined
    global.window = {} as Window & typeof globalThis;

    const result = getBaseUrl();

    expect(result).toBe('');
  });

  it('returns API_URL on server-side when set', () => {
    // Simulate server-side
    global.window = undefined as unknown as Window & typeof globalThis;
    process.env.API_URL = 'http://test-api.com';

    const result = getBaseUrl();

    expect(result).toBe('http://test-api.com');
  });

  it('returns default URL on server-side when API_URL is not set', () => {
    // Simulate server-side
    global.window = undefined as unknown as Window & typeof globalThis;
    delete process.env.API_URL;

    const result = getBaseUrl();

    expect(result).toBe('http://localhost:8000');
  });
});
