import { describe, it, expect } from 'vitest';
import { createStaffAlert } from '@test/utils/staffAlertFactories';
import {
  KIND_LABEL,
  KIND_ORDER,
  alertLink,
  badgeText,
  handledBy,
  queryOf,
  toggled,
} from './staff-alerts';

const JOB = '11111111-1111-4111-8111-000000000001';

describe('alertLink: where each alert is dealt with', () => {
  it('sends a job alert to that job in the review pages', () => {
    expect(alertLink({ type: 'job', id: JOB })).toEqual({
      href: `/admin/review/${JOB}`,
      label: 'Open the job',
    });
  });

  it('sends a printer alert to the print farm page', () => {
    expect(alertLink({ type: 'printer', id: 'p-7' })?.href).toBe('/admin/review/farm');
  });

  it('sends a pipeline alert to the review queue, which shows the pipeline state', () => {
    expect(alertLink({ type: 'pipeline_health' })?.href).toBe('/admin/review');
  });

  it('offers no link for a job alert without a job, or no target', () => {
    expect(alertLink({ type: 'job', id: null })).toBeNull();
    expect(alertLink(null)).toBeNull();
    expect(alertLink(undefined)).toBeNull();
  });
});

describe('queryOf', () => {
  it('sends only the filters that are set, and the page size', () => {
    expect(queryOf({ kinds: [], states: [] })).toEqual({ limit: 50 });
    expect(queryOf({ kinds: ['hold', 'escalation'], states: ['open'] }, 100)).toEqual({
      kind: ['hold', 'escalation'],
      state: ['open'],
      limit: 100,
    });
  });

  it('never asks for more than the backend gives', () => {
    expect(queryOf({ kinds: [], states: [] }, 500).limit).toBe(200);
  });
});

describe('small helpers', () => {
  it('toggles a value in and out of a list', () => {
    expect(toggled(['open'], 'resolved')).toEqual(['open', 'resolved']);
    expect(toggled(['open', 'resolved'], 'open')).toEqual(['resolved']);
  });

  it('shows 9+ on the badge past nine', () => {
    expect(badgeText(3)).toBe('3');
    expect(badgeText(9)).toBe('9');
    expect(badgeText(10)).toBe('9+');
  });

  it('says who handled an alert, or that it closed itself', () => {
    expect(handledBy(createStaffAlert())).toBeNull();
    expect(
      handledBy(
        createStaffAlert({ state: 'acknowledged', acknowledgedBy: { id: 5, name: 'Cam Crew' } }),
      ),
    ).toBe('Acknowledged by Cam Crew');
    expect(
      handledBy(createStaffAlert({ state: 'resolved', resolvedBy: { id: 5, name: 'Cam Crew' } })),
    ).toBe('Resolved by Cam Crew');
    expect(handledBy(createStaffAlert({ state: 'resolved', autoResolved: true }))).toBe(
      'Closed automatically',
    );
  });
});

describe('kinds', () => {
  it('offers a filter for every kind the backend raises, farm alerts included', () => {
    expect([...KIND_ORDER].sort()).toEqual(Object.keys(KIND_LABEL).sort());
    expect(KIND_ORDER).toContain('farm_job_held');
    expect(KIND_ORDER).toContain('printer_quarantined');
    expect(KIND_ORDER).toContain('student_disagrees');
    expect(KIND_LABEL.student_disagrees).toBe('Student disagrees');
  });
});
