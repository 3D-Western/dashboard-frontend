import type { AccessDevice, DeviceKind, GatekeeperHealth, LockMethod } from '@/types/access-admin';

/**
 * How long a gatekeeper or device may stay quiet before the screens stop calling it online. The
 * gatekeeper sends a health report "every few minutes" (contract 3.4) and each report refreshes every
 * device's last heartbeat, so ten minutes means two or three reports were missed.
 */
export const STALE_AFTER_MINUTES = 10;

export const DEVICE_KIND_LABELS: Record<DeviceKind, string> = {
  KIOSK: 'Kiosk',
  STATION: 'Card reader',
  PLUG: 'Smart plug',
};

export const DEVICE_KIND_HELP: Record<DeviceKind, string> = {
  KIOSK: 'The entrance screen where people check in and out. It belongs to no machine.',
  STATION:
    'The card reader at one machine. The machine settings (how it is locked, when it counts as off) are kept here.',
  PLUG: 'The smart plug that powers one machine. Its network address is set here.',
};

export const LOCK_METHOD_LABELS: Record<LockMethod, string> = {
  PLUG: 'Smart plug (power on and off)',
  RELAY: 'Relay in the start circuit',
  ENABLE_INPUT: 'Controller enable input',
};

export const LOCK_METHOD_HELP: Record<LockMethod, string> = {
  PLUG: 'A tap switches the plug on, and it switches off when the machine has been idle long enough.',
  RELAY:
    'A tap only allows the start button to work. The machine keeps running once started; stopping it needs a new tap.',
  ENABLE_INPUT: 'A tap sets the machine controller’s enable input. Optional, for later.',
};

/** A report in the shape we expect, or null when there is none or it is not an object. */
export function healthOf(raw: unknown): GatekeeperHealth | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === 'string' ? value : undefined);
  const count = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  return {
    reportedAt: text(source.reportedAt),
    version: text(source.version),
    uptimeSeconds: count(source.uptimeSeconds),
    lastSyncAt: typeof source.lastSyncAt === 'string' ? source.lastSyncAt : null,
    snapshotCursor: text(source.snapshotCursor),
    journalPending: count(source.journalPending),
    streamConnected:
      typeof source.streamConnected === 'boolean' ? source.streamConnected : undefined,
    errors: Array.isArray(source.errors)
      ? source.errors.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

export type StatusTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface Status {
  tone: StatusTone;
  label: string;
}

function minutesSince(iso: string, now: number): number {
  return (now - new Date(iso).getTime()) / 60_000;
}

/** Whether a gatekeeper has called in recently. */
export function gatekeeperStatus(
  gatekeeper: { active: boolean; lastSeenAt: string | null },
  now: number,
): Status {
  if (!gatekeeper.active) return { tone: 'neutral', label: 'Deactivated' };
  if (!gatekeeper.lastSeenAt) return { tone: 'neutral', label: 'Never connected' };
  return minutesSince(gatekeeper.lastSeenAt, now) <= STALE_AFTER_MINUTES
    ? { tone: 'good', label: 'Online' }
    : { tone: 'bad', label: 'Not heard from recently' };
}

/** Online, offline or in trouble, from the last health report and how old its heartbeat is. */
export function deviceStatus(
  device: Pick<AccessDevice, 'active' | 'healthStatus' | 'lastHeartbeatAt'>,
  now: number,
): Status {
  if (!device.active) return { tone: 'neutral', label: 'Deactivated' };
  if (!device.lastHeartbeatAt && !device.healthStatus) {
    return { tone: 'neutral', label: 'Never seen' };
  }
  if (device.healthStatus === 'ERROR') return { tone: 'bad', label: 'Problem' };
  if (device.healthStatus === 'OFFLINE') return { tone: 'bad', label: 'Offline' };
  if (!device.lastHeartbeatAt || minutesSince(device.lastHeartbeatAt, now) > STALE_AFTER_MINUTES) {
    return { tone: 'warn', label: 'No recent heartbeat' };
  }
  return { tone: 'good', label: 'Online' };
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", or "never". */
export function formatAgo(iso: string | null | undefined, now: number): string {
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/** A date and time in the viewer's own time zone. */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/** "45 min", "2 h 5 min": how long something has been going. */
export function formatDuration(startIso: string, now: number): string {
  const totalMinutes = Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 60_000));
  if (totalMinutes < 1) return 'under a minute';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** "3 days 4 h", "2 h 10 min", "5 min". */
export function formatUptime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ${hours % 24} h`;
}

export function personName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  studentNumber: number,
): string {
  return [firstName, lastName].filter(Boolean).join(' ') || `Student ${studentNumber}`;
}

/** The idle rule in one sentence, e.g. "Counts as off under 5 W for 10 min". */
export function idleSummary(
  device: Pick<AccessDevice, 'idlePowerWatts' | 'idleMinutes'>,
): string | null {
  if (device.idlePowerWatts === null && device.idleMinutes === null) return null;
  const watts = device.idlePowerWatts === null ? '?' : `${device.idlePowerWatts} W`;
  const minutes = device.idleMinutes === null ? '?' : `${device.idleMinutes} min`;
  return `Counts as off under ${watts} for ${minutes}`;
}

/** The staff-facing name for a card's source. */
export function cardSourceLabel(source: 'KIOSK_TAP' | 'ADMIN'): string {
  return source === 'KIOSK_TAP' ? 'Linked at the kiosk' : 'Linked by an admin';
}
