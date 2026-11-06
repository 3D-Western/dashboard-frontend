import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatWait,
  isAboutEarlierPlan,
  newRequestId,
  questionsLeftText,
} from './pipeline-disagree';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newRequestId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is a v4 uuid, different each time', () => {
    const a = newRequestId();
    expect(a).toMatch(UUID);
    expect(newRequestId()).not.toBe(a);
  });

  it('still makes one where crypto.randomUUID is missing (plain-http pages)', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => bytes.map((_, i) => (i * 37) % 256),
    });
    expect(newRequestId()).toMatch(UUID);
    vi.stubGlobal('crypto', undefined);
    expect(newRequestId()).toMatch(UUID);
  });
});

describe('formatWait', () => {
  it('speaks in seconds, minutes and hours', () => {
    expect(formatWait(1)).toBe('1 second');
    expect(formatWait(5)).toBe('5 seconds');
    expect(formatWait(0)).toBe('1 second');
    expect(formatWait(90)).toBe('2 minutes');
    expect(formatWait(60)).toBe('1 minute');
    expect(formatWait(3600)).toBe('about 1 hour');
    expect(formatWait(7200)).toBe('about 2 hours');
  });
});

describe('questionsLeftText', () => {
  it('counts down to none', () => {
    expect(questionsLeftText(3)).toBe('3 questions left');
    expect(questionsLeftText(1)).toBe('1 question left');
    expect(questionsLeftText(0)).toBe('No questions left for now.');
  });
});

describe('isAboutEarlierPlan', () => {
  it('is true only when both plan ids are known and differ', () => {
    expect(isAboutEarlierPlan('plan-1', 'plan-2')).toBe(true);
    expect(isAboutEarlierPlan('plan-2', 'plan-2')).toBe(false);
    expect(isAboutEarlierPlan(null, 'plan-2')).toBe(false);
    expect(isAboutEarlierPlan('plan-1', undefined)).toBe(false);
  });
});
