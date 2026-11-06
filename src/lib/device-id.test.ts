import { describe, it, expect, afterEach, vi } from 'vitest';
import { getDeviceId } from './device-id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('getDeviceId', () => {
  it('creates a random id once and keeps it for later visits', () => {
    const first = getDeviceId();

    expect(first).toMatch(UUID_V4);
    expect(getDeviceId()).toBe(first);
  });

  it('replaces a stored value that is not a valid id', () => {
    window.localStorage.setItem('device-id', 'not a valid id!');

    expect(getDeviceId()).toMatch(UUID_V4);
  });

  it('returns null when storage is blocked, so the header is left out', () => {
    // Browsers that block site data make reading window.localStorage itself throw
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(getDeviceId()).toBeNull();
  });
});
