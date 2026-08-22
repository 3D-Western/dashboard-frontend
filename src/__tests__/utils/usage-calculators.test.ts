import { describe, it, expect } from 'vitest';
import {
  canAccessBooking,
  calculateUsage,
  calculateRemainingQuota,
  isOverLimit,
} from '@/utils/usage-calculators';
import { ProjectTypeLimit, UsageEntry } from '@/types/usage';

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

describe('calculateUsage', () => {
  it('aggregates jobs correctly per project type', () => {
    const jobs = [
      { category: 'ThreeDPrint' },
      { category: 'ThreeDPrint' },
      { category: 'LaserCutting' },
    ];

    const result = calculateUsage(jobs, 'month');

    expect(result).toContainEqual({ projectType: 'ThreeDPrint', used: 2, period: 'month' });
    expect(result).toContainEqual({ projectType: 'LaserCutting', used: 1, period: 'month' });
  });

  it('returns an empty array when there are no jobs', () => {
    expect(calculateUsage([], 'month')).toEqual([]);
  });

  it('tags every entry with the requested period', () => {
    const jobs = [{ category: 'CNC' }];
    const result = calculateUsage(jobs, 'semester');

    expect(result[0].period).toBe('semester');
  });
});

describe('calculateRemainingQuota', () => {
  const limits: ProjectTypeLimit[] = [
    { projectType: 'ThreeDPrint', limit: 5, period: 'month' },
    { projectType: 'Waterjet', limit: -1, period: 'month' },
  ];

  it('calculates remaining quota when under limit', () => {
    const usage: UsageEntry[] = [{ projectType: 'ThreeDPrint', used: 2, period: 'month' }];
    const [quota] = calculateRemainingQuota(usage, [limits[0]]);

    expect(quota.used).toBe(2);
    expect(quota.remaining).toBe(3);
    expect(quota.isUnlimited).toBe(false);
  });

  it('clamps remaining to 0 when usage is over limit', () => {
    const usage: UsageEntry[] = [{ projectType: 'ThreeDPrint', used: 8, period: 'month' }];
    const [quota] = calculateRemainingQuota(usage, [limits[0]]);

    expect(quota.remaining).toBe(0);
  });

  it('treats a -1 limit as unlimited', () => {
    const usage: UsageEntry[] = [{ projectType: 'Waterjet', used: 40, period: 'month' }];
    const [quota] = calculateRemainingQuota(usage, [limits[1]]);

    expect(quota.isUnlimited).toBe(true);
    expect(quota.remaining).toBe(-1);
  });

  it('defaults used to 0 when there is no matching usage entry', () => {
    const [quota] = calculateRemainingQuota([], [limits[0]]);

    expect(quota.used).toBe(0);
    expect(quota.remaining).toBe(5);
  });
});

describe('isOverLimit', () => {
  const limits: ProjectTypeLimit[] = [
    { projectType: 'ThreeDPrint', limit: 5, period: 'month' },
    { projectType: 'Waterjet', limit: -1, period: 'month' },
  ];

  it('returns false when usage is under every limit', () => {
    const usage: UsageEntry[] = [{ projectType: 'ThreeDPrint', used: 2, period: 'month' }];
    expect(isOverLimit(usage, limits)).toBe(false);
  });

  it('returns true when usage meets or exceeds a limit', () => {
    const usage: UsageEntry[] = [{ projectType: 'ThreeDPrint', used: 5, period: 'month' }];
    expect(isOverLimit(usage, limits)).toBe(true);
  });

  it('returns false for unlimited project types regardless of usage', () => {
    const usage: UsageEntry[] = [{ projectType: 'Waterjet', used: 999, period: 'month' }];
    expect(isOverLimit(usage, limits)).toBe(false);
  });
});
