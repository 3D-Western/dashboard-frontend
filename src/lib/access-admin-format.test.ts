import { describe, it, expect } from 'vitest';
import {
  deviceStatus,
  formatAgo,
  formatDuration,
  formatUptime,
  gatekeeperStatus,
  healthOf,
  idleSummary,
  personName,
  STALE_AFTER_MINUTES,
} from './access-admin-format';

const NOW = Date.parse('2026-10-20T15:00:00Z');
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

describe('deviceStatus', () => {
  it('is online with a recent heartbeat', () => {
    expect(
      deviceStatus({ active: true, healthStatus: 'ONLINE', lastHeartbeatAt: ago(1) }, NOW),
    ).toEqual({
      tone: 'good',
      label: 'Online',
    });
  });

  it('warns when the last heartbeat is older than the stale limit', () => {
    const status = deviceStatus(
      { active: true, healthStatus: 'ONLINE', lastHeartbeatAt: ago(STALE_AFTER_MINUTES + 1) },
      NOW,
    );

    expect(status).toEqual({ tone: 'warn', label: 'No recent heartbeat' });
  });

  it('reports offline, problems, never seen and deactivated', () => {
    expect(
      deviceStatus({ active: true, healthStatus: 'OFFLINE', lastHeartbeatAt: ago(1) }, NOW).label,
    ).toBe('Offline');
    expect(
      deviceStatus({ active: true, healthStatus: 'ERROR', lastHeartbeatAt: ago(1) }, NOW).label,
    ).toBe('Problem');
    expect(
      deviceStatus({ active: true, healthStatus: null, lastHeartbeatAt: null }, NOW).label,
    ).toBe('Never seen');
    expect(
      deviceStatus({ active: false, healthStatus: 'ONLINE', lastHeartbeatAt: ago(1) }, NOW).label,
    ).toBe('Deactivated');
  });
});

describe('gatekeeperStatus', () => {
  it('goes from online to not heard from', () => {
    expect(gatekeeperStatus({ active: true, lastSeenAt: ago(2) }, NOW).label).toBe('Online');
    expect(gatekeeperStatus({ active: true, lastSeenAt: ago(30) }, NOW).label).toBe(
      'Not heard from recently',
    );
    expect(gatekeeperStatus({ active: true, lastSeenAt: null }, NOW).label).toBe('Never connected');
    expect(gatekeeperStatus({ active: false, lastSeenAt: ago(1) }, NOW).label).toBe('Deactivated');
  });
});

describe('healthOf', () => {
  it('reads a report and ignores what it does not understand', () => {
    expect(
      healthOf({ version: '1.0', uptimeSeconds: 'soon', journalPending: 2, errors: ['x', 4] }),
    ).toMatchObject({
      version: '1.0',
      uptimeSeconds: undefined,
      journalPending: 2,
      errors: ['x'],
    });
  });

  it('is null when there is no report', () => {
    expect(healthOf(null)).toBeNull();
    expect(healthOf('text')).toBeNull();
    expect(healthOf([])).toBeNull();
  });
});

describe('time words', () => {
  it('says how long ago', () => {
    expect(formatAgo(null, NOW)).toBe('never');
    expect(formatAgo(ago(0.1), NOW)).toBe('just now');
    expect(formatAgo(ago(5), NOW)).toBe('5 min ago');
    expect(formatAgo(ago(180), NOW)).toBe('3 h ago');
    expect(formatAgo(ago(60 * 24 * 4), NOW)).toBe('4 days ago');
  });

  it('says how long something has run', () => {
    expect(formatDuration(ago(0.2), NOW)).toBe('under a minute');
    expect(formatDuration(ago(45), NOW)).toBe('45 min');
    expect(formatDuration(ago(120), NOW)).toBe('2 h');
    expect(formatDuration(ago(125), NOW)).toBe('2 h 5 min');
  });

  it('formats uptime', () => {
    expect(formatUptime(300)).toBe('5 min');
    expect(formatUptime(7500)).toBe('2 h 5 min');
    expect(formatUptime(90_000)).toBe('1 day 1 h');
  });
});

describe('names and summaries', () => {
  it('falls back to the student number when there is no name', () => {
    expect(personName('Ada', 'Lovelace', 1)).toBe('Ada Lovelace');
    expect(personName(null, null, 251000002)).toBe('Student 251000002');
  });

  it('summarises the idle rule', () => {
    expect(idleSummary({ idlePowerWatts: 5, idleMinutes: 10 })).toBe(
      'Counts as off under 5 W for 10 min',
    );
    expect(idleSummary({ idlePowerWatts: null, idleMinutes: null })).toBeNull();
  });
});
