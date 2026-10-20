import { describe, it, expect } from 'vitest';
import { getPeriodResetDate } from './usage-calculators';

describe('getPeriodResetDate', () => {
  it('resets monthly limits on the 1st of next month', () => {
    expect(getPeriodResetDate('month', new Date(2026, 9, 15))).toEqual(new Date(2026, 10, 1));
  });

  it('rolls a December month over into January', () => {
    expect(getPeriodResetDate('month', new Date(2026, 11, 31))).toEqual(new Date(2027, 0, 1));
  });

  it('resets weekly limits on the next Monday', () => {
    // Thursday Oct 15 -> Monday Oct 19; a Monday resets the following Monday
    expect(getPeriodResetDate('week', new Date(2026, 9, 15))).toEqual(new Date(2026, 9, 19));
    expect(getPeriodResetDate('week', new Date(2026, 9, 19))).toEqual(new Date(2026, 9, 26));
  });

  it("returns null for semesters, whose dates the frontend doesn't know", () => {
    expect(getPeriodResetDate('semester')).toBeNull();
  });
});
