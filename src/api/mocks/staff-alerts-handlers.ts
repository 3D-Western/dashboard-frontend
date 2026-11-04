import { http, HttpResponse } from 'msw';
import { PERMISSIONS } from '@/constants/permissions';
import type { AlertSummary, StaffAlert } from '@/types/staff-alerts';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import {
  createInvalidSessionResponse,
  generateSuccessResponse,
  mockUserHasPermission,
} from './utils';

const apiUrl = process.env.API_URL;

// The staff alerts API (dashboard-backend StaffAlertController) with an in-memory store, so the
// alerts centre and the nav badge can be built without the backend. Every route needs a session
// with jobs:update_status (like the backend).

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const alerts: StaffAlert[] = [
  {
    id: 3,
    kind: 'escalation',
    severity: 'critical',
    state: 'open',
    title: 'A print job was escalated',
    summary:
      'A print job was escalated and needs a person. The student has not been told and still sees "preparing".',
    details: [
      { label: 'Job', value: '11111111-1111-4111-8111-000000000003' },
      { label: 'Staff status', value: 'escalated' },
      { label: 'Findings', value: 'moderation.grey_zone' },
    ],
    target: { type: 'job', id: '11111111-1111-4111-8111-000000000003' },
    occurrences: 1,
    createdAt: minutesAgo(4),
    lastRaisedAt: minutesAgo(4),
    autoResolved: false,
  },
  {
    id: 2,
    kind: 'hold',
    severity: 'warning',
    state: 'open',
    title: 'A print job was held',
    summary:
      'A print job was held for review and needs a person. The student has not been told and still sees "preparing".',
    details: [
      { label: 'Job', value: '11111111-1111-4111-8111-000000000001' },
      { label: 'Staff status', value: 'held' },
      { label: 'Findings', value: 'walls.too_thin' },
    ],
    target: { type: 'job', id: '11111111-1111-4111-8111-000000000001' },
    occurrences: 1,
    createdAt: minutesAgo(35),
    lastRaisedAt: minutesAgo(35),
    autoResolved: false,
  },
  {
    id: 1,
    kind: 'pipeline_outage',
    severity: 'critical',
    state: 'resolved',
    title: 'Print pipeline is not responding',
    summary:
      'The dashboard cannot reach the slicing pipeline. Uploads are still accepted and queued and nothing unsafe prints.',
    details: [{ label: 'Failed calls in a row', value: '3' }],
    target: { type: 'pipeline_health' },
    occurrences: 2,
    createdAt: minutesAgo(600),
    lastRaisedAt: minutesAgo(240),
    resolvedAt: minutesAgo(200),
    resolutionNote: 'The pipeline answered again',
    autoResolved: true,
  },
];

const error = (status: number, code: string, message: string) =>
  HttpResponse.json({ success: false, data: null, error: { code, message } }, { status });

const needsStaff = (cookies: Record<string, string>) => {
  const user = db.validateSession(cookies['sessionToken'] || '');
  if (!user) return createInvalidSessionResponse();
  if (!mockUserHasPermission(user, PERMISSIONS.JOBS_UPDATE_STATUS))
    return error(403, 'FORBIDDEN', 'Staff only');
  return null;
};

const unread = () => alerts.filter((a) => a.state === 'open');

export const staffAlertsHandlers = [
  http.get(`${apiUrl}${endpoints.staffAlerts.list}`, ({ cookies, request }) => {
    const refused = needsStaff(cookies);
    if (refused) return refused;
    const params = new URL(request.url).searchParams;
    const split = (name: string) => (params.get(name) ?? '').split(',').filter(Boolean);
    const kinds = split('kind');
    const states = split('state');
    const items = alerts
      .filter((a) => kinds.length === 0 || kinds.includes(a.kind))
      .filter((a) => states.length === 0 || states.includes(a.state))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json(
      generateSuccessResponse({
        items: items.slice(0, Number(params.get('limit') ?? 50)),
        total: items.length,
        unacknowledged: unread().length,
      }),
    );
  }),

  http.get(`${apiUrl}${endpoints.staffAlerts.summary}`, ({ cookies }) => {
    const refused = needsStaff(cookies);
    if (refused) return refused;
    const summary: AlertSummary = {
      unacknowledged: unread().length,
      unacknowledgedCritical: unread().filter((a) => a.severity === 'critical').length,
    };
    return HttpResponse.json(generateSuccessResponse(summary));
  }),

  http.post(`${apiUrl}/api/v1/admin/alerts/:id/acknowledge`, ({ cookies, params }) => {
    const refused = needsStaff(cookies);
    if (refused) return refused;
    const alert = alerts.find((a) => a.id === Number(params.id));
    if (!alert) return error(404, 'NOT_FOUND', 'Alert not found');
    if (alert.state === 'resolved') return error(409, 'CONFLICT', 'That alert is already resolved');
    if (alert.state === 'open') {
      alert.state = 'acknowledged';
      alert.acknowledgedAt = new Date().toISOString();
      alert.acknowledgedBy = { id: 0, name: 'You' };
    }
    return HttpResponse.json(generateSuccessResponse(alert));
  }),

  http.post(`${apiUrl}/api/v1/admin/alerts/:id/resolve`, async ({ cookies, params, request }) => {
    const refused = needsStaff(cookies);
    if (refused) return refused;
    const alert = alerts.find((a) => a.id === Number(params.id));
    if (!alert) return error(404, 'NOT_FOUND', 'Alert not found');
    if (alert.state === 'resolved') return error(409, 'CONFLICT', 'That alert is already resolved');
    const { note } = (await request.json()) as { note?: string };
    if (!note || note.trim().length < 3)
      return error(400, 'VALIDATION_FAILED', 'A note is required');
    alert.state = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = { id: 0, name: 'You' };
    alert.resolutionNote = note.trim();
    alert.autoResolved = false;
    return HttpResponse.json(generateSuccessResponse(alert));
  }),
];
