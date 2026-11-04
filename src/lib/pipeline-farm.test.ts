import { describe, expect, it } from 'vitest';
import {
  buildClearRequest,
  buildResolveRequest,
  heldOldestFirst,
  printerLabel,
  quarantinedOldestFirst,
  validateReason,
} from './pipeline-farm';

describe('validateReason', () => {
  it('requires a reason of 3 to 1000 characters once trimmed', () => {
    expect(validateReason('')).toBe('A reason is required.');
    expect(validateReason('   ')).toBe('A reason is required.');
    expect(validateReason(' ab ')).toMatch(/at least 3/);
    expect(validateReason('x'.repeat(1001))).toMatch(/at most 1000/);
    expect(validateReason('Cleaned the nozzle')).toBeNull();
  });
});

describe('request bodies', () => {
  it('retry and close differ only in `retry`, with the reason trimmed', () => {
    expect(buildResolveRequest('retry', '  bin was full ')).toEqual({
      retry: true,
      reason: 'bin was full',
    });
    expect(buildResolveRequest('close', 'lost in the farm')).toEqual({
      retry: false,
      reason: 'lost in the farm',
    });
  });

  it('clearing a quarantine carries the trimmed reason', () => {
    expect(buildClearRequest('  new hotend ')).toEqual({ reason: 'new hotend' });
  });
});

describe('ordering and labels', () => {
  it('lists the longest-waiting first', () => {
    const held = heldOldestFirst([
      { jobId: 'new', heldSince: '2026-11-04T10:00:00Z' },
      { jobId: 'old', heldSince: '2026-11-03T10:00:00Z' },
    ] as never);
    expect(held.map((j) => j.jobId)).toEqual(['old', 'new']);

    const printers = quarantinedOldestFirst([
      { printerId: 'b', quarantinedAt: '2026-11-04T10:00:00Z' },
      { printerId: 'a', quarantinedAt: '2026-11-01T10:00:00Z' },
    ] as never);
    expect(printers.map((p) => p.printerId)).toEqual(['a', 'b']);
  });

  it('names a printer by its friendly name and id, or by id alone', () => {
    expect(printerLabel({ name: 'Printer 12', printerId: 'P12' })).toBe('Printer 12 (P12)');
    expect(printerLabel({ name: null, printerId: 'P12' })).toBe('Printer P12');
  });
});
