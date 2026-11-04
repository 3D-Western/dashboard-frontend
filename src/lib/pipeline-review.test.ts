import { describe, it, expect } from 'vitest';
import {
  createFinding,
  createQueueItem,
  createReportQueueItem,
  createStaffUser,
} from '@test/utils/pipelineReviewFactories';
import type { Finding, QueueItem, StaffDecisionType } from '@/types/pipeline-review';
import {
  buildDecisionRequest,
  canResolveEscalation,
  canReviewPrints,
  decisionsFor,
  filterQueue,
  findingsAsCards,
  formatEvidence,
  formatPrintTime,
  needsConfirmation,
  releasableFindings,
  REASON_MAX,
  screeningRendersOf,
  shortCodes,
  sortDecisions,
  statusesOf,
  validateDecision,
} from './pipeline-review';

const withPermissions = (permissions: { key: string; scopeKey: string }[]) => ({
  ...createStaffUser([]),
  permissions,
});

describe('permissions', () => {
  it('lets a staff user with only jobs:update_status review, but not resolve escalations', () => {
    const staff = createStaffUser(['jobs:update_status']);
    expect(canReviewPrints(staff)).toBe(true);
    expect(canResolveEscalation(staff)).toBe(false);
  });

  it('lets a user with both permissions review and resolve', () => {
    const elevated = createStaffUser(['jobs:update_status', 'jobs:resolve_escalation']);
    expect(canReviewPrints(elevated)).toBe(true);
    expect(canResolveEscalation(elevated)).toBe(true);
  });

  it('gives neither right to a user whose permissions are own-scope only', () => {
    const own = withPermissions([
      { key: 'jobs:update_status', scopeKey: 'own' },
      { key: 'jobs:resolve_escalation', scopeKey: 'own' },
    ]);
    expect(canReviewPrints(own)).toBe(false);
    expect(canResolveEscalation(own)).toBe(false);
  });

  it('gives neither right to a user lacking the permissions', () => {
    const plain = createStaffUser([]);
    expect(canReviewPrints(plain)).toBe(false);
    expect(canResolveEscalation(plain)).toBe(false);
  });

  it('gives neither right to a missing user', () => {
    expect(canReviewPrints(null)).toBe(false);
    expect(canResolveEscalation(null)).toBe(false);
    expect(canReviewPrints(undefined)).toBe(false);
    expect(canResolveEscalation(undefined)).toBe(false);
  });

  it('hides resolve_escalation from a reviewer without the elevated permission', () => {
    const staff = createStaffUser(['jobs:update_status']);
    const allowed: StaffDecisionType[] = ['approve', 'resolve_escalation', 'reject'];
    expect(decisionsFor(allowed, staff)).toEqual(['approve', 'reject']);
  });

  it('keeps resolve_escalation for a user with the elevated permission', () => {
    const elevated = createStaffUser(['jobs:update_status', 'jobs:resolve_escalation']);
    const allowed: StaffDecisionType[] = ['approve', 'resolve_escalation'];
    expect(decisionsFor(allowed, elevated)).toEqual(['approve', 'resolve_escalation']);
  });

  it('returns no decisions for a non-staff user', () => {
    const allowed: StaffDecisionType[] = ['approve', 'reject'];
    expect(decisionsFor(allowed, createStaffUser([]))).toEqual([]);
    expect(decisionsFor(allowed, null)).toEqual([]);
  });

  it('returns no decisions when the backend offers none', () => {
    expect(decisionsFor(undefined, createStaffUser(['jobs:update_status']))).toEqual([]);
  });
});

describe('validateDecision', () => {
  const base = { decision: 'approve' as const, codes: [] as string[] };

  it('requires a reason, blank or whitespace-only is not one', () => {
    expect(validateDecision({ ...base, reason: '' }).reason).toBeDefined();
    expect(validateDecision({ ...base, reason: '   ' }).reason).toBeDefined();
  });

  it('rejects a reason shorter than 3 characters after trimming', () => {
    expect(validateDecision({ ...base, reason: 'ab' }).reason).toBeDefined();
    expect(validateDecision({ ...base, reason: '  ab  ' }).reason).toBeDefined();
  });

  it('rejects a reason longer than 1000 characters', () => {
    expect(validateDecision({ ...base, reason: 'x'.repeat(REASON_MAX + 1) }).reason).toBeDefined();
  });

  it('accepts a reason of exactly 1000 characters and of 3 characters', () => {
    expect(validateDecision({ ...base, reason: 'x'.repeat(REASON_MAX) })).toEqual({});
    expect(validateDecision({ ...base, reason: 'abc' })).toEqual({});
  });

  it('requires at least one code for a release', () => {
    const errors = validateDecision({ decision: 'release', reason: 'ok fine', codes: [] });
    expect(errors.codes).toBeDefined();
    expect(errors.reason).toBeUndefined();
  });

  it('accepts a release with codes', () => {
    expect(
      validateDecision({ decision: 'release', reason: 'ok fine', codes: ['walls.too_thin'] }),
    ).toEqual({});
  });

  it('needs no codes for a non-release decision', () => {
    expect(validateDecision({ decision: 'reject', reason: 'not safe', codes: [] })).toEqual({});
  });
});

describe('buildDecisionRequest', () => {
  it('trims the reason', () => {
    const body = buildDecisionRequest({ decision: 'approve', reason: '  looks fine  ', codes: [] });
    expect(body.reason).toBe('looks fine');
  });

  it('includes codes only for a release', () => {
    const body = buildDecisionRequest({
      decision: 'release',
      reason: 'checked',
      codes: ['walls.too_thin', 'overhang.unsupported'],
    });
    expect(body).toEqual({
      decision: 'release',
      reason: 'checked',
      codes: ['walls.too_thin', 'overhang.unsupported'],
    });
  });

  it('copies the codes instead of sharing the draft array', () => {
    const codes = ['walls.too_thin'];
    const body = buildDecisionRequest({ decision: 'release', reason: 'checked', codes });
    expect(body.codes).not.toBe(codes);
  });

  it('has exactly the keys decision and reason for every other decision', () => {
    const others: StaffDecisionType[] = [
      'approve',
      'reject',
      'escalate',
      'resolve_escalation',
      'rerun',
      'cancel',
    ];
    for (const decision of others) {
      const body = buildDecisionRequest({
        decision,
        reason: '  a reason  ',
        codes: ['walls.too_thin'],
      });
      expect(Object.keys(body).sort()).toEqual(['decision', 'reason']);
      expect(body).toEqual({ decision, reason: 'a reason' });
    }
  });
});

describe('needsConfirmation', () => {
  it('asks for confirmation before reject, escalate, cancel and resolve_escalation', () => {
    expect(needsConfirmation('reject')).toBe(true);
    expect(needsConfirmation('escalate')).toBe(true);
    expect(needsConfirmation('cancel')).toBe(true);
    expect(needsConfirmation('resolve_escalation')).toBe(true);
  });

  it('does not ask for release, approve or rerun', () => {
    expect(needsConfirmation('release')).toBe(false);
    expect(needsConfirmation('approve')).toBe(false);
    expect(needsConfirmation('rerun')).toBe(false);
  });
});

describe('sortDecisions', () => {
  it('orders the positive outcomes first and the final ones last', () => {
    expect(sortDecisions(['cancel', 'reject', 'rerun', 'release', 'approve'])).toEqual([
      'approve',
      'release',
      'rerun',
      'reject',
      'cancel',
    ]);
  });

  it('does not reorder the array it is given', () => {
    const input: StaffDecisionType[] = ['cancel', 'approve'];
    sortDecisions(input);
    expect(input).toEqual(['cancel', 'approve']);
  });
});

describe('filterQueue', () => {
  const held = createQueueItem({ jobId: 'held-late', since: '2026-11-03T15:00:00Z' });
  const escalated = createQueueItem({
    jobId: 'escalated-mid',
    staffStatus: 'escalated',
    since: '2026-11-03T14:00:00Z',
  });
  const heldEarly = createQueueItem({ jobId: 'held-early', since: '2026-11-03T13:00:00Z' });
  const report = createReportQueueItem({ since: '2026-11-03T12:00:00Z' });
  const items: QueueItem[] = [held, escalated, heldEarly, report];

  it('lists everything oldest first when no filter is active', () => {
    const result = filterQueue(items, []);
    expect(result.map((i) => i.since)).toEqual([
      '2026-11-03T12:00:00Z',
      '2026-11-03T13:00:00Z',
      '2026-11-03T14:00:00Z',
      '2026-11-03T15:00:00Z',
    ]);
    expect(result).toHaveLength(4);
  });

  it('shows only held jobs for the held filter, oldest first', () => {
    expect(filterQueue(items, ['held']).map((i) => i.jobId)).toEqual(['held-early', 'held-late']);
  });

  it('shows only report items for the reports filter', () => {
    const result = filterQueue(items, ['reports']);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('Report');
  });

  it('does not mutate the input array', () => {
    const copy = [...items];
    filterQueue(items, []);
    expect(items).toEqual(copy);
  });
});

describe('statusesOf', () => {
  it('keeps the job statuses and drops the reports filter', () => {
    expect(statusesOf(['held', 'reports', 'escalated'])).toEqual(['held', 'escalated']);
    expect(statusesOf(['reports'])).toEqual([]);
    expect(statusesOf([])).toEqual([]);
  });
});

describe('releasableFindings', () => {
  it('returns only the holds when there are holds', () => {
    const hold = createFinding({ code: 'walls.too_thin', severity: 'hold' });
    const info = createFinding({ code: 'tips.size', severity: 'info' });
    expect(releasableFindings([info, hold])).toEqual([hold]);
  });

  it('falls back to all findings when there are no holds', () => {
    const info = createFinding({ code: 'tips.size', severity: 'info' });
    const other = createFinding({ code: 'tips.speed', severity: 'info' });
    expect(releasableFindings([info, other])).toEqual([info, other]);
  });
});

describe('findingsAsCards', () => {
  it('keeps only findings that have a region', () => {
    const withRegion = createFinding({
      code: 'walls.too_thin',
      region: { bboxMm: [0, 0, 0, 1, 1, 1] },
    });
    const noRegion = createFinding({ code: 'tips.size', region: null });
    const cards = findingsAsCards([withRegion, noRegion]);
    expect(cards.map((c) => c.code)).toEqual(['walls.too_thin']);
  });

  it('maps a finding to a card with its message, severity and region', () => {
    const finding: Finding = createFinding({
      code: 'overhang.unsupported',
      severity: 'hold',
      message: 'The arm overhangs.',
      region: { faces: [2, 3] },
    });
    expect(findingsAsCards([finding])).toEqual([
      {
        code: 'overhang.unsupported',
        title: 'The arm overhangs.',
        body: 'The arm overhangs.',
        severity: 'hold',
        region: { faces: [2, 3] },
        consequential: true,
      },
    ]);
  });

  it('marks info findings as not consequential', () => {
    const info = createFinding({ severity: 'info', region: { layers: [0, 4] } });
    expect(findingsAsCards([info])[0].consequential).toBe(false);
  });
});

describe('screeningRendersOf', () => {
  it('names each render by its view and keeps the backend’s link', () => {
    expect(
      screeningRendersOf([
        { kind: 'screening_png', view: 'iso', url: 'https://files.example/iso.png?sig=1' },
        { kind: 'screening_png', view: 'top', url: 'https://files.example/top.png?sig=2' },
      ]),
    ).toEqual([
      { name: 'iso', url: 'https://files.example/iso.png?sig=1' },
      { name: 'top', url: 'https://files.example/top.png?sig=2' },
    ]);
  });

  it('names a render without a view by its place in the list', () => {
    expect(screeningRendersOf([{ kind: 'screening_png', url: '/a.png' }])).toEqual([
      { name: 'render 1', url: '/a.png' },
    ]);
  });

  it('ignores other kinds and entries without a link', () => {
    expect(
      screeningRendersOf([
        { kind: 'gcode', view: 'plate', url: '/plate.gcode' },
        { kind: 'screening_png', view: 'front', url: '' },
      ]),
    ).toEqual([]);
  });

  it('is empty when the job has none', () => {
    expect(screeningRendersOf(undefined)).toEqual([]);
    expect(screeningRendersOf(null)).toEqual([]);
    expect(screeningRendersOf([])).toEqual([]);
  });
});

describe('formatEvidence', () => {
  it('shows n/a for a missing value', () => {
    expect(formatEvidence(null)).toBe('n/a');
    expect(formatEvidence(undefined, 'mm')).toBe('n/a');
  });

  it('adds the unit after a number, rounding to three decimals', () => {
    expect(formatEvidence(12, 'mm')).toBe('12 mm');
    expect(formatEvidence(0.123456)).toBe('0.123');
    expect(formatEvidence(0.6666, 'mm')).toBe('0.667 mm');
  });

  it('shows text as it is and booleans as yes or no', () => {
    expect(formatEvidence('on')).toBe('on');
    expect(formatEvidence(true)).toBe('yes');
    expect(formatEvidence(false)).toBe('no');
  });

  it('shows lists and objects as JSON', () => {
    expect(formatEvidence([1, 2])).toBe('[1,2]');
    expect(formatEvidence({ a: 1 }, 'deg')).toBe('{"a":1} deg');
  });
});

describe('formatPrintTime', () => {
  it('shows hours and minutes', () => {
    expect(formatPrintTime(3 * 3600 + 25 * 60)).toBe('3 h 25 min');
  });

  it('shows only minutes under an hour', () => {
    expect(formatPrintTime(45 * 60)).toBe('45 min');
  });

  it('returns null when there is no time', () => {
    expect(formatPrintTime(null)).toBeNull();
    expect(formatPrintTime(undefined)).toBeNull();
  });
});

describe('shortCodes', () => {
  it('lists up to three codes', () => {
    expect(shortCodes(['a.one', 'b.two'])).toBe('a.one, b.two');
    expect(shortCodes(['a', 'b', 'c'])).toBe('a, b, c');
  });

  it('shows how many codes are left over', () => {
    expect(shortCodes(['a', 'b', 'c', 'd', 'e'])).toBe('a, b, c +2');
  });

  it('is empty for no codes', () => {
    expect(shortCodes(undefined)).toBe('');
    expect(shortCodes([])).toBe('');
  });

  it('honours a custom maximum', () => {
    expect(shortCodes(['a', 'b', 'c'], 1)).toBe('a +2');
  });
});
