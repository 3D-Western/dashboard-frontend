import type { AlertListResponse, StaffAlert } from '@/types/staff-alerts';

export const ALERT_JOB_ID = '11111111-1111-4111-8111-000000000001';

/** An open hold alert about one job; override what a test cares about. */
export function createStaffAlert(overrides: Partial<StaffAlert> = {}): StaffAlert {
  return {
    id: 1,
    kind: 'hold',
    severity: 'warning',
    state: 'open',
    title: 'A print job was held',
    summary: 'A print job was held for review and needs a person.',
    details: [
      { label: 'Job', value: ALERT_JOB_ID },
      { label: 'Findings', value: 'walls.too_thin' },
    ],
    target: { type: 'job', id: ALERT_JOB_ID },
    occurrences: 1,
    createdAt: '2026-11-04T08:50:00Z',
    lastRaisedAt: '2026-11-04T08:50:00Z',
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null,
    autoResolved: false,
    ...overrides,
  };
}

export function createAlertList(
  items: StaffAlert[] = [createStaffAlert()],
  overrides: Partial<AlertListResponse> = {},
): AlertListResponse {
  return {
    items,
    total: items.length,
    unacknowledged: items.filter((a) => a.state === 'open').length,
    ...overrides,
  };
}
