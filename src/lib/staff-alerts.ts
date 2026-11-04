// The logic of the alerts centre that needs no DOM: labels, filters, and where each alert is
// dealt with. Staff only (same permission as the print review pages).

import { Routes } from '@/lib/routes';
import type {
  AlertKind,
  AlertQuery,
  AlertSeverity,
  AlertState,
  AlertTarget,
  StaffAlert,
} from '@/types/staff-alerts';

export const ALERT_REFRESH_MS = 15_000;
export const SUMMARY_REFRESH_MS = 30_000;
export const ALERT_PAGE_SIZE = 50;

export const KIND_LABEL: Record<AlertKind, string> = {
  hold: 'Hold',
  escalation: 'Escalation',
  pipeline_outage: 'Pipeline outage',
  pipeline_recovered: 'Pipeline recovered',
  farm_job_held: 'Farm job held',
  printer_quarantined: 'Printer quarantined',
};

export const KIND_ORDER: AlertKind[] = [
  'hold',
  'escalation',
  'farm_job_held',
  'printer_quarantined',
  'pipeline_outage',
  'pipeline_recovered',
];

export const STATE_LABEL: Record<AlertState, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
};

export const STATE_ORDER: AlertState[] = ['open', 'acknowledged', 'resolved'];

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

/** Open and acknowledged: what is still being worked on. */
export const ACTIVE_STATES: AlertState[] = ['open', 'acknowledged'];

export interface AlertFilter {
  kinds: AlertKind[];
  states: AlertState[];
}

/** Open alerts first thing: that is what a person comes here for. */
export const DEFAULT_FILTER: AlertFilter = { kinds: [], states: ['open'] };

/** The backend never returns more than this many alerts in one go. */
export const ALERT_MAX_LIMIT = 200;

export function queryOf(filter: AlertFilter, limit = ALERT_PAGE_SIZE): AlertQuery {
  return {
    ...(filter.kinds.length > 0 ? { kind: filter.kinds } : {}),
    ...(filter.states.length > 0 ? { state: filter.states } : {}),
    limit: Math.min(limit, ALERT_MAX_LIMIT),
  };
}

export function toggled<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export interface AlertLink {
  href: string;
  label: string;
}

/** Where an alert is dealt with: the job's review page, the farm page, or the review queue. */
export function alertLink(target: AlertTarget | null | undefined): AlertLink | null {
  if (!target) return null;
  switch (target.type) {
    case 'job':
      return target.id ? { href: Routes.adminReviewJob(target.id), label: 'Open the job' } : null;
    case 'printer':
      return { href: Routes.adminReviewFarm, label: 'Open the print farm' };
    case 'pipeline_health':
      return { href: Routes.adminReview, label: 'Open the review queue' };
    default:
      return null;
  }
}

/** The number on the nav badge: "9+" past nine so it never outgrows the menu. */
export const badgeText = (count: number) => (count > 9 ? '9+' : String(count));

/** Who and when an alert was last dealt with, in a few words (for the card footer). */
export function handledBy(alert: StaffAlert): string | null {
  if (alert.state === 'resolved') {
    return alert.autoResolved
      ? 'Closed automatically'
      : `Resolved by ${alert.resolvedBy?.name ?? `staff ${alert.resolvedBy?.id ?? ''}`.trim()}`;
  }
  if (alert.state === 'acknowledged') {
    return `Acknowledged by ${alert.acknowledgedBy?.name ?? `staff ${alert.acknowledgedBy?.id ?? ''}`.trim()}`;
  }
  return null;
}
