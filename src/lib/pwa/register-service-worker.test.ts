import { describe, it, expect, vi } from 'vitest';
import { registerServiceWorker } from './register-service-worker';

function fakeNavigator() {
  const registration = { update: vi.fn().mockResolvedValue(undefined) };
  const register = vi.fn().mockResolvedValue(registration);
  return { nav: { serviceWorker: { register } } as unknown as Navigator, register, registration };
}

describe('registerServiceWorker', () => {
  it('registers /sw.js for the whole site in a production build', async () => {
    const { nav, register, registration } = fakeNavigator();

    const result = await registerServiceWorker({ env: 'production', nav });

    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
    expect(result).toBe(registration);
  });

  it.each(['development', 'test'])('does nothing in a %s build', async (env) => {
    const { nav, register } = fakeNavigator();

    expect(await registerServiceWorker({ env, nav })).toBeNull();
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing in the test run by default (NODE_ENV is not production)', async () => {
    const { nav, register } = fakeNavigator();
    expect(await registerServiceWorker({ nav })).toBeNull();
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing in a browser without service workers', async () => {
    expect(await registerServiceWorker({ env: 'production', nav: {} })).toBeNull();
  });

  it('survives a failed registration', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nav = {
      serviceWorker: { register: vi.fn().mockRejectedValue(new Error('blocked')) },
    } as unknown as Navigator;

    expect(await registerServiceWorker({ env: 'production', nav })).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('checks for a new worker when the app comes back to the foreground', async () => {
    const { nav, registration } = fakeNavigator();
    await registerServiceWorker({ env: 'production', nav });

    document.dispatchEvent(new Event('visibilitychange'));

    expect(registration.update).toHaveBeenCalled();
  });
});
