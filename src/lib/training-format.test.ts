import { describe, it, expect } from 'vitest';
import {
  daysUntil,
  formatClock,
  formatDate,
  formatWhen,
  isCertified,
  statusLabel,
} from './training-format';
import { createTrainingSummary } from '@test/utils/trainingFactories';

const NOW = new Date('2026-10-20T12:00:00Z');
const later = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

describe('formatWhen', () => {
  it('uses minutes, then hours, then a calendar date', () => {
    expect(formatWhen(later(30_000), NOW)).toBe('in under a minute');
    expect(formatWhen(later(60_000), NOW)).toBe('in 1 minute');
    expect(formatWhen(later(5 * 60_000), NOW)).toBe('in 5 minutes');
    expect(formatWhen(later(61 * 60_000), NOW)).toBe('in 2 hours');
    expect(formatWhen(later(3 * 24 * 3_600_000), NOW)).toMatch(/^on /);
  });

  it('says now for the past, and copes with garbage', () => {
    expect(formatWhen(later(-1000), NOW)).toBe('now');
    expect(formatWhen('nonsense', NOW)).toBe('later');
  });
});

describe('formatDate / daysUntil / formatClock', () => {
  it('formats a date and counts days', () => {
    expect(formatDate('2027-03-04T12:00:00Z')).toMatch(/2027/);
    expect(formatDate('nonsense')).toBe('');
    expect(daysUntil(later(2.5 * 24 * 3_600_000), NOW)).toBe(3);
    expect(daysUntil(later(-3_600_000), NOW)).toBeLessThanOrEqual(0);
  });

  it('formats a video position', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65.9)).toBe('1:05');
    expect(formatClock(600)).toBe('10:00');
    expect(formatClock(NaN)).toBe('0:00');
  });
});

describe('status helpers', () => {
  const certified = (status: 'ACTIVE' | 'REFRESHER_DUE' | 'LAPSED') =>
    createTrainingSummary({
      certification: {
        status,
        activeSince: null,
        expiresAt: null,
        addonRequired: false,
        addonDueAt: null,
      },
    });

  it('labels a training in plain words', () => {
    expect(statusLabel(createTrainingSummary())).toBe('Not started');
    expect(statusLabel(certified('ACTIVE'))).toBe('Certified');
    expect(statusLabel(certified('LAPSED'))).toBe('Lapsed');
  });

  it('counts active and refresher-due as certified, lapsed as not', () => {
    expect(isCertified(certified('ACTIVE'))).toBe(true);
    expect(isCertified(certified('REFRESHER_DUE'))).toBe(true);
    expect(isCertified(certified('LAPSED'))).toBe(false);
    expect(isCertified(createTrainingSummary())).toBe(false);
  });
});
