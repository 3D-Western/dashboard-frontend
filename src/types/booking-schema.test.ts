import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newBookingSchema } from './booking-schema';

const baseData = {
  equipmentId: 'laser-1',
  timeSlot: '2:00 PM - 4:00 PM',
  purpose: 'Capstone prototyping',
};

describe('newBookingSchema', () => {
  beforeEach(() => {
    // Fix "now" to noon on 2026-06-15 so date/time-slot checks are deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects a past date', () => {
    const result = newBookingSchema.safeParse({ ...baseData, date: '2026-06-14' });
    expect(result.success).toBe(false);
  });

  it('rejects a same-day time slot that has already passed', () => {
    const result = newBookingSchema.safeParse({
      ...baseData,
      date: '2026-06-15',
      timeSlot: '8:00 AM - 10:00 AM',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a same-day time slot that has not started yet', () => {
    const result = newBookingSchema.safeParse({
      ...baseData,
      date: '2026-06-15',
      timeSlot: '2:00 PM - 4:00 PM',
    });
    expect(result.success).toBe(true);
  });

  it('accepts any time slot for a future date', () => {
    const result = newBookingSchema.safeParse({
      ...baseData,
      date: '2026-06-16',
      timeSlot: '8:00 AM - 10:00 AM',
    });
    expect(result.success).toBe(true);
  });
});
