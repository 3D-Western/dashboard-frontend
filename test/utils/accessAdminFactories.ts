import type {
  AccessDevice,
  AccessMachine,
  AccessStudent,
  CardLink,
  Gatekeeper,
  LiveAccess,
} from '@/types/access-admin';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const createGatekeeper = (overrides: Partial<Gatekeeper> = {}): Gatekeeper => ({
  id: 1,
  name: 'Makerspace PC',
  active: true,
  pollIntervalSeconds: 30,
  maxOfflineTrustHours: null,
  nightlyResetTime: '03:00',
  tapDebounceSeconds: 3,
  lastSeenAt: minutesAgo(2),
  healthReportedAt: minutesAgo(3),
  health: {
    reportedAt: minutesAgo(3),
    version: '0.1.0',
    uptimeSeconds: 90_000,
    lastSyncAt: minutesAgo(4),
    journalPending: 3,
    streamConnected: true,
    errors: ['plug laser-1-plug: timeout'],
  },
  tokenRotatedAt: minutesAgo(60 * 24),
  createdAt: minutesAgo(60 * 48),
  ...overrides,
});

export const createDevice = (overrides: Partial<AccessDevice> = {}): AccessDevice => ({
  id: 10,
  deviceKey: 'laser-1-station',
  kind: 'STATION',
  name: 'Laser 1 card reader',
  machineId: 5,
  machineName: 'Laser 1',
  gatekeeperId: 1,
  active: true,
  lockMethod: 'PLUG',
  idlePowerWatts: 12.5,
  idleMinutes: 15,
  maxSessionMinutes: null,
  checkInRequired: true,
  networkAddress: null,
  lastHeartbeatAt: minutesAgo(1),
  healthStatus: 'ONLINE',
  healthDetail: null,
  keyRotatedAt: minutesAgo(60),
  createdAt: minutesAgo(600),
  ...overrides,
});

export const createMachine = (overrides: Partial<AccessMachine> = {}): AccessMachine => ({
  id: 5,
  name: 'Laser 1',
  slug: 'laser-1',
  location: 'Sabourin',
  active: true,
  ...overrides,
});

export const createStudent = (overrides: Partial<AccessStudent> = {}): AccessStudent => ({
  studentNumber: 251234567,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'alovela@uwo.ca',
  ...overrides,
});

export const createCardLink = (overrides: Partial<CardLink> = {}): CardLink => ({
  id: 70,
  uid: '04AABB01',
  studentNumber: 251234567,
  linkedAt: minutesAgo(60 * 24 * 3),
  source: 'KIOSK_TAP',
  active: true,
  deactivatedAt: null,
  deactivatedReason: null,
  ...overrides,
});

export const createLive = (overrides: Partial<LiveAccess> = {}): LiveAccess => ({
  generatedAt: new Date().toISOString(),
  visits: [
    {
      id: 1,
      studentNumber: 251234567,
      firstName: 'Ada',
      lastName: 'Lovelace',
      startedAt: minutesAgo(125),
    },
    { id: 2, studentNumber: 251000002, firstName: null, lastName: null, startedAt: minutesAgo(10) },
  ],
  sessions: [
    {
      id: 9,
      studentNumber: 251234567,
      firstName: 'Ada',
      lastName: 'Lovelace',
      machineId: 5,
      machineName: 'Laser 1',
      startedAt: minutesAgo(45),
    },
  ],
  ...overrides,
});
