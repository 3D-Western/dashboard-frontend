import { describe, expect, it } from 'vitest';
import {
  BED_NOTE_MAX,
  bedBlocksOldestFirst,
  buildClearBedRequest,
  buildReferenceRequest,
  isPrinterId,
  validateBedNote,
  buildClearRequest,
  buildResolveRequest,
  heldOldestFirst,
  printerLabel,
  quarantinedOldestFirst,
  validateReason,
  buildWaiveRequest,
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
  it('a waiver carries only the trimmed reason', () => {
    expect(buildWaiveRequest('  student left the club ')).toEqual({
      reason: 'student left the club',
    });
  });

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

  it('clearing a quarantine carries the trimmed text as the backend’s `cause`', () => {
    expect(buildClearRequest('  new hotend ')).toEqual({ cause: 'new hotend' });
  });
});

describe('ordering and labels', () => {
  it('lists the longest-waiting first', () => {
    const held = heldOldestFirst([
      { jobId: 'new', since: '2026-11-04T10:00:00Z' },
      { jobId: 'old', since: '2026-11-03T10:00:00Z' },
    ] as never);
    expect(held.map((j) => j.jobId)).toEqual(['old', 'new']);

    const printers = quarantinedOldestFirst([
      { printerId: 'b', quarantinedAt: '2026-11-04T10:00:00Z' },
      { printerId: 'a', quarantinedAt: '2026-11-01T10:00:00Z' },
    ] as never);
    expect(printers.map((p) => p.printerId)).toEqual(['a', 'b']);
  });

  it('puts a printer with no known quarantine time last', () => {
    const printers = quarantinedOldestFirst([
      { printerId: 'unknown' },
      { printerId: 'known', quarantinedAt: '2026-11-01T10:00:00Z' },
    ] as never);
    expect(printers.map((p) => p.printerId)).toEqual(['known', 'unknown']);
  });

  it('names a printer by its id', () => {
    expect(printerLabel({ printerId: 'P12' })).toBe('Printer P12');
  });
});

describe('the empty-bed check', () => {
  it('a bed-clear request carries only a trimmed note, if there is one', () => {
    expect(buildClearBedRequest('  plate was clean ')).toEqual({ note: 'plate was clean' });
    expect(buildClearBedRequest('   ')).toEqual({});
  });

  it('a reference request always carries the confirmation, and the trimmed note if any', () => {
    expect(buildReferenceRequest('')).toEqual({ confirmed: true });
    expect(buildReferenceRequest(' light on ')).toEqual({ confirmed: true, note: 'light on' });
  });

  it('a note is optional and at most 2000 characters', () => {
    expect(validateBedNote('')).toBeNull();
    expect(validateBedNote('x'.repeat(BED_NOTE_MAX))).toBeNull();
    expect(validateBedNote('x'.repeat(BED_NOTE_MAX + 1))).toMatch(/at most 2000/);
  });

  it('knows the printer ids the backend accepts', () => {
    for (const id of ['P12', '-01P00C581401090', 'bambu_3', 'a.b:c-d'])
      expect(isPrinterId(id)).toBe(true);
    for (const id of ['', '..', '.', 'a b', 'a/b', 'P 12', 'x'.repeat(129)])
      expect(isPrinterId(id)).toBe(false);
  });

  it('lists the longest-held printer first', () => {
    const block = (printerId: string, blockedAt: string) => ({
      printerId,
      verdict: 'unsure' as const,
      code: 'c',
      reason: 'r',
      blockedAt,
      lastCheckedAt: blockedAt,
    });
    expect(
      bedBlocksOldestFirst([
        block('b', '2026-11-06T11:00:00Z'),
        block('a', '2026-11-06T09:00:00Z'),
      ]).map((b) => b.printerId),
    ).toEqual(['a', 'b']);
  });
});
