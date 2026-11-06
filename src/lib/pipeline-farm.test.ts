import { describe, expect, it } from 'vitest';
import {
  BED_NOTE_MAX,
  TEMP_NOTE_MAX,
  buildReadingRequest,
  parseCelsius,
  readingState,
  validateReading,
  agentHeadline,
  formatBand,
  formatCelsius,
  formatSpan,
  roomTempHeadline,
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
import type { FarmAgent, RoomTemperature } from '@/types/pipeline-farm';

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

const room = (patch: Partial<RoomTemperature> = {}): RoomTemperature => ({
  enabled: true,
  loopRunning: true,
  code: 'in_band',
  holding: false,
  summary: 'The room is 22.4 C.',
  celsius: 22.4,
  bandMinC: 16,
  bandMaxC: 27,
  checkStalled: false,
  heldJobCount: 0,
  heldJobs: [],
  ...patch,
});

const agent = (patch: Partial<FarmAgent> = {}): FarmAgent => ({
  configured: true,
  transport: 'remote',
  state: 'online',
  problem: false,
  problems: [],
  farmProblems: [],
  openCommands: 0,
  switches: {
    farmLiveEnabled: false,
    liveViewEnabled: false,
    emptyBedEnabled: false,
    roomTempEnabled: true,
  },
  ...patch,
});

describe('formatting a reading and a span', () => {
  it('shows a reading to one decimal and says when there is none', () => {
    expect(formatCelsius(22.44)).toBe('22.4 °C');
    expect(formatCelsius(null)).toBe('no reading');
    expect(formatCelsius(undefined)).toBe('no reading');
    expect(formatCelsius(Number.NaN)).toBe('no reading');
  });

  it('writes a span in the largest sensible unit', () => {
    expect(formatSpan(12)).toBe('12 s');
    expect(formatSpan(299)).toBe('5 min');
    expect(formatSpan(360)).toBe('6 min');
    expect(formatSpan(3600)).toBe('1 h');
    expect(formatSpan(7800)).toBe('2 h 10 min');
    expect(formatSpan(3 * 86400)).toBe('3 days');
    expect(formatSpan(86400)).toBe('1 day');
    expect(formatSpan(null)).toBe('unknown');
    expect(formatSpan(-1)).toBe('unknown');
  });

  it('writes the band, or nothing when the pipeline sent none', () => {
    expect(formatBand({ bandMinC: 16, bandMaxC: 27 })).toBe('16-27 °C');
    expect(formatBand({})).toBe('');
  });
});

describe('roomTempHeadline', () => {
  it('is fine only for a fresh reading in range that does not hold', () => {
    expect(roomTempHeadline(room())).toEqual({ tone: 'ok', label: 'In range' });
  });

  it('reads no reading and a stale reading as a hold, never as fine', () => {
    expect(roomTempHeadline(room({ code: 'missing', holding: true, celsius: null }))).toEqual({
      tone: 'hold',
      label: 'No reading: holding new prints',
    });
    expect(roomTempHeadline(room({ code: 'stale', holding: true }))).toEqual({
      tone: 'hold',
      label: 'Reading out of date: holding new prints',
    });
    expect(roomTempHeadline(room({ code: 'unchecked', holding: true, celsius: null })).tone).toBe(
      'hold',
    );
  });

  it('is a problem, not fine, when the settings let prints go on without a reading', () => {
    expect(roomTempHeadline(room({ code: 'missing', holding: false, celsius: null }))).toEqual({
      tone: 'problem',
      label: 'No reading: printing anyway',
    });
  });

  it('says too hot and too cold', () => {
    expect(roomTempHeadline(room({ code: 'too_hot', holding: true })).label).toBe(
      'Too hot: holding new prints',
    );
    expect(roomTempHeadline(room({ code: 'too_cold', holding: true })).label).toBe(
      'Too cold: holding new prints',
    );
  });

  it('is a problem when nobody has checked for a long time, whatever it last said', () => {
    expect(roomTempHeadline(room({ checkStalled: true }))).toEqual({
      tone: 'problem',
      label: 'Not being checked',
    });
  });

  it('is off when the watch is off, and reads a code it does not know as a hold', () => {
    expect(roomTempHeadline(room({ enabled: false, code: null }))).toEqual({
      tone: 'off',
      label: 'Watch is off',
    });
    expect(roomTempHeadline(room({ code: 'humid', holding: true })).tone).toBe('hold');
  });
});

describe('agentHeadline', () => {
  it('is ok for a healthy agent and a problem for one that reports trouble', () => {
    expect(agentHeadline(agent())).toEqual({ tone: 'ok', label: 'Online' });
    expect(agentHeadline(agent({ problem: true, problems: ['kill switch'] }))).toEqual({
      tone: 'problem',
      label: 'Online, with problems',
    });
  });

  it('shows silence as a problem with how long', () => {
    expect(agentHeadline(agent({ state: 'silent', problem: true, silentForS: 360 }))).toEqual({
      tone: 'problem',
      label: 'Silent for 6 min',
    });
  });

  it('shows an agent that never came as a problem, and a pipeline without one as off', () => {
    expect(agentHeadline(agent({ state: 'never_connected', problem: true })).tone).toBe('problem');
    expect(agentHeadline(agent({ state: 'not_used', configured: false })).tone).toBe('off');
  });
});

describe('staff thermometer readings', () => {
  it('reads a typed temperature the way a person writes it', () => {
    expect(parseCelsius('23')).toBe(23);
    expect(parseCelsius(' 23.5 ')).toBe(23.5);
    expect(parseCelsius('23,5')).toBe(23.5);
    expect(parseCelsius('21.5 °C')).toBe(21.5);
    expect(parseCelsius('21c')).toBe(21);
    expect(parseCelsius('-3')).toBe(-3);
    expect(parseCelsius('.5')).toBe(0.5);
  });

  it('refuses what is not a number', () => {
    for (const text of ['', 'warm', '2x3', '23..5', '1e3', 'NaN', 'Infinity', '--3', '23 F'])
      expect(parseCelsius(text)).toBeNull();
  });

  it('says what is wrong before anything is sent', () => {
    expect(validateReading('', '')).toMatch(/Type what the thermometer shows/);
    expect(validateReading('warm', '')).toMatch(/must be a number/);
    expect(validateReading('101', '')).toMatch(/between -60 and 100/);
    expect(validateReading('-61', '')).toMatch(/between -60 and 100/);
    expect(validateReading('22', 'x'.repeat(TEMP_NOTE_MAX + 1))).toMatch(/at most 500/);
    expect(validateReading('22', 'x'.repeat(TEMP_NOTE_MAX))).toBeNull();
    // A number that is not a believable room is the pipeline's call, with its own words.
    expect(validateReading('80', '')).toBeNull();
  });

  it('builds the request with the trimmed note, and without an empty one', () => {
    expect(buildReadingRequest('23,5', '  by the door ')).toEqual({
      celsius: 23.5,
      note: 'by the door',
    });
    expect(buildReadingRequest('22', '   ')).toEqual({ celsius: 22 });
    expect(() => buildReadingRequest('warm', '')).toThrow();
  });

  it('names a reading’s state', () => {
    const base = { id: 1, celsius: 22, takenAt: 't', enteredAt: 't', enteredBy: 'Sam' };
    expect(readingState({ ...base, inUse: true })).toBe('in use');
    expect(readingState({ ...base, inUse: false })).toBe('earlier');
    expect(readingState({ ...base, inUse: false, withdrawnAt: 'x' })).toBe('withdrawn');
    expect(readingState({ ...base, inUse: true, withdrawnAt: 'x' })).toBe('withdrawn');
  });
});
