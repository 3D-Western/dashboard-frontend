import { afterEach, describe, expect, it, vi } from 'vitest';
import { isJobCreationEnabled } from './feature-flags';

describe('isJobCreationEnabled', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is off when the variable is not set (the launch default)', () => {
    vi.stubEnv('NEXT_PUBLIC_JOB_CREATION_ENABLED', '');
    expect(isJobCreationEnabled()).toBe(false);
  });

  it('is off for anything but "true"', () => {
    for (const value of ['false', '1', 'yes', 'TRUE']) {
      vi.stubEnv('NEXT_PUBLIC_JOB_CREATION_ENABLED', value);
      expect(isJobCreationEnabled()).toBe(false);
    }
  });

  it('is on only when the variable is "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_JOB_CREATION_ENABLED', 'true');
    expect(isJobCreationEnabled()).toBe(true);
  });
});
