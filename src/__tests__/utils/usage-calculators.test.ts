import { describe, it, expect } from 'vitest';
import { canAccessBooking } from '@/utils/usage-calculators';

describe('canAccessBooking', () => {
  it('allows LEVEL_2 users', () => {
    expect(canAccessBooking('LEVEL_2')).toBe(true);
  });

  it('blocks LEVEL_1 users', () => {
    expect(canAccessBooking('LEVEL_1')).toBe(false);
  });

  it('blocks when training level is null', () => {
    expect(canAccessBooking(null)).toBe(false);
  });

  it('blocks when training level is undefined', () => {
    expect(canAccessBooking(undefined)).toBe(false);
  });
});