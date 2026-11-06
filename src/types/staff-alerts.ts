// What staff see in the alerts centre: the dashboard backend's staff alerts API
// (dashboard-backend entities/pipeline/alert/DashboardAlertService.kt, StaffAlertController.kt;
// decision P-135: alerts always live in the admin dashboard). Staff only. The text of an alert is
// staff-facing but carries no student identity (a job id and finding codes at most). Field names
// are the backend's camelCase JSON; enum values are its wire strings.

export type AlertKind =
  | 'hold'
  | 'escalation'
  | 'pipeline_outage'
  | 'pipeline_recovered'
  | 'farm_job_held'
  | 'printer_quarantined'
  /** The empty-bed check holds a printer back (P-106): a person looks at the bed. Closes itself when the block is lifted. */
  | 'clear_bed'
  /** The room-temperature watch holds new prints or has no usable reading (P-175). One alert per episode; closes itself when the room is back in band. */
  | 'room_temperature'
  /** The farm agent on the server PC is silent, never connected or reports a problem (P-175). Closes itself when it is healthy again. */
  | 'farm_agent'
  /** A student asked the crew after the "Ask why" assistant (P-54); details hold their reason and the conversation. */
  | 'student_disagrees';

/** How urgent: info needs no action (stored already closed), critical is an escalation or outage. */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * open: nobody has seen it. acknowledged: seen, someone is on it. resolved: done, by a person
 * with a note or automatically when the trigger cleared (a hold released, the pipeline back).
 */
export type AlertState = 'open' | 'acknowledged' | 'resolved';

/** Where an alert is dealt with. A pipeline-health or farm alert has no id. */
export type AlertTargetType = 'job' | 'printer' | 'pipeline_health' | 'farm';

export interface AlertTarget {
  type: AlertTargetType;
  id?: string | null;
}

export interface AlertDetail {
  label: string;
  value: string;
}

export interface AlertActor {
  id: number;
  name?: string | null;
}

export interface StaffAlert {
  id: number;
  kind: AlertKind;
  severity: AlertSeverity;
  state: AlertState;
  title: string;
  summary: string;
  details: AlertDetail[];
  target?: AlertTarget | null;
  /** How many times the same open alert was raised (an outage repeats every few hours). */
  occurrences: number;
  createdAt: string;
  lastRaisedAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: AlertActor | null;
  resolvedAt?: string | null;
  resolvedBy?: AlertActor | null;
  resolutionNote?: string | null;
  /** True when it closed itself because its trigger cleared (or it was informational). */
  autoResolved: boolean;
}

export interface AlertListResponse {
  items: StaffAlert[];
  /** Alerts matching the filters, all pages. */
  total: number;
  /** Alerts nobody has acknowledged or resolved, whatever the filters: the nav badge number. */
  unacknowledged: number;
}

export interface AlertSummary {
  unacknowledged: number;
  unacknowledgedCritical: number;
}

export interface AlertQuery {
  kind?: AlertKind[];
  state?: AlertState[];
  severity?: AlertSeverity[];
  limit?: number;
}

export interface ResolveAlertRequest {
  note: string;
}
