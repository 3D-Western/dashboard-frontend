import { describe, it, expect } from 'vitest';
import type { TrainingAuditEntry } from '@/types/training-audit';
import {
  AUDIT_PAGE_SIZE,
  auditActorLabel,
  auditQueryFromFilters,
  EMPTY_AUDIT_FILTERS,
  startOfLocalDay,
  startOfNextLocalDay,
} from './training-audit';

const entry = (overrides: Partial<TrainingAuditEntry>): TrainingAuditEntry => ({
  id: 1,
  createdAt: '2026-10-20T15:04:00Z',
  actor: { studentId: 900000001, firstName: 'Sam', lastName: 'Lee' },
  actorType: 'STAFF',
  action: 'TRAINING_CREATED',
  entityType: 'TRAINING',
  entityId: '3',
  trainingId: 3,
  summary: 'Created a training',
  details: null,
  ...overrides,
});

describe('auditQueryFromFilters', () => {
  it('sends only the page size when nothing is filtered', () => {
    expect(auditQueryFromFilters(EMPTY_AUDIT_FILTERS)).toEqual({
      trainingId: undefined,
      action: undefined,
      actorId: undefined,
      from: undefined,
      to: undefined,
      pageSize: AUDIT_PAGE_SIZE,
    });
  });

  it('turns every filled-in field into its query value', () => {
    expect(
      auditQueryFromFilters({
        trainingId: '3',
        action: 'STEP_ADDED',
        actorId: ' 900000001 ',
        from: '2026-10-01',
        to: '2026-10-01',
      }),
    ).toEqual({
      trainingId: 3,
      action: 'STEP_ADDED',
      actorId: 900000001,
      from: new Date(2026, 9, 1).toISOString(),
      to: new Date(2026, 9, 2).toISOString(),
      pageSize: AUDIT_PAGE_SIZE,
    });
  });

  it('leaves out anything that is only half typed', () => {
    const query = auditQueryFromFilters({
      ...EMPTY_AUDIT_FILTERS,
      actorId: '9000x',
      from: '2026-1',
      to: '',
    });

    expect(query.actorId).toBeUndefined();
    expect(query.from).toBeUndefined();
    expect(query.to).toBeUndefined();
  });
});

describe('day boundaries', () => {
  it('start at local midnight, and the next day starts a day later', () => {
    expect(startOfLocalDay('2026-12-31')).toBe(new Date(2026, 11, 31).toISOString());
    expect(startOfNextLocalDay('2026-12-31')).toBe(new Date(2027, 0, 1).toISOString());
  });

  it('are undefined for anything that is not a full date', () => {
    expect(startOfLocalDay('')).toBeUndefined();
    expect(startOfNextLocalDay('31/12/2026')).toBeUndefined();
  });
});

describe('auditActorLabel', () => {
  it('names a staff member, and falls back to the student number when there is no name', () => {
    expect(auditActorLabel(entry({}))).toBe('Sam Lee');
    expect(
      auditActorLabel(entry({ actor: { studentId: 900000002, firstName: null, lastName: null } })),
    ).toBe('Student 900000002');
  });

  it('says a Teams approval came through Teams, and an automatic change had nobody signed in', () => {
    expect(auditActorLabel(entry({ actorType: 'INTEGRATION' }))).toBe('Sam Lee (through Teams)');
    expect(auditActorLabel(entry({ actor: null, actorType: 'SYSTEM' }))).toBe(
      'Automatic (nobody signed in)',
    );
  });
});
