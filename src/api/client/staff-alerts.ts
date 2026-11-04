import type {
  AlertListResponse,
  AlertQuery,
  AlertSummary,
  ResolveAlertRequest,
  StaffAlert,
} from '@/types/staff-alerts';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

/**
 * The alerts centre of the admin section (P-135): holds, escalations and pipeline outages, each
 * with where to deal with it. Every endpoint needs `jobs:update_status` (any scope). Staff pages only.
 */

const request = <T>(path: string, init: RequestInit = {}) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, { credentials: 'include', ...init });

/** `?kind=a,b&state=c&severity=d&limit=n`; nothing is sent for a filter left empty. */
export function alertsUrl(query: AlertQuery = {}): string {
  const params = new URLSearchParams();
  if (query.kind && query.kind.length > 0) params.set('kind', query.kind.join(','));
  if (query.state && query.state.length > 0) params.set('state', query.state.join(','));
  if (query.severity && query.severity.length > 0) params.set('severity', query.severity.join(','));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const qs = params.toString();
  return `${endpoints.staffAlerts.list}${qs ? `?${qs}` : ''}`;
}

export const staffAlertsApi = {
  /** Newest first, with the number of alerts that still need a person. */
  list: (query: AlertQuery = {}, options?: RequestInit) =>
    request<AlertListResponse>(alertsUrl(query), { method: 'GET', ...options }),

  /** Just the counts, for the nav badge. */
  summary: (options?: RequestInit) =>
    request<AlertSummary>(endpoints.staffAlerts.summary, { method: 'GET', ...options }),

  /** "Seen, someone is on it." Idempotent; 409 once the alert is resolved. */
  acknowledge: (alertId: number) =>
    request<StaffAlert>(endpoints.staffAlerts.acknowledge(alertId), { method: 'POST' }),

  /** Close it with a note (3 to 1000 characters); 409 if it is already resolved. */
  resolve: (alertId: number, body: ResolveAlertRequest) =>
    request<StaffAlert>(endpoints.staffAlerts.resolve(alertId), {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
