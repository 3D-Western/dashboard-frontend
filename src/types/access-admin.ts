/** Shapes of the admin access API (docs/specs/gatekeeper-contract.md, section 5). Dates are ISO strings. */

export type DeviceKind = 'KIOSK' | 'STATION' | 'PLUG';
export type LockMethod = 'PLUG' | 'RELAY' | 'ENABLE_INPUT';
export type DeviceHealthStatus = 'ONLINE' | 'OFFLINE' | 'ERROR';
export type CardLinkSource = 'KIOSK_TAP' | 'ADMIN';

/** The latest health report a gatekeeper sent (contract 3.4). Every field is optional: the PC may omit what it does not know. */
export interface GatekeeperHealth {
  reportedAt?: string;
  version?: string;
  uptimeSeconds?: number;
  lastSyncAt?: string | null;
  snapshotCursor?: string;
  journalPending?: number;
  streamConnected?: boolean;
  errors?: string[];
}

export interface Gatekeeper {
  id: number;
  name: string;
  active: boolean;
  pollIntervalSeconds: number;
  maxOfflineTrustHours: number | null;
  nightlyResetTime: string;
  tapDebounceSeconds: number;
  /** The gatekeeper takes a full snapshot at least this often (a backstop for missed pushes). */
  reconcileMinutes: number;
  lastSeenAt: string | null;
  healthReportedAt: string | null;
  /** The raw report; use `healthOf` to read it safely. */
  health: unknown;
  tokenRotatedAt: string | null;
  createdAt: string;
}

/** The token is in this response and nowhere else. */
export interface GatekeeperSecret {
  gatekeeper: Gatekeeper;
  token: string;
}

export interface GatekeeperBody {
  name?: string;
  active?: boolean;
  pollIntervalSeconds?: number;
  /** On update, 0 clears the limit. */
  maxOfflineTrustHours?: number;
  nightlyResetTime?: string;
  tapDebounceSeconds?: number;
  reconcileMinutes?: number;
}

export interface AccessDevice {
  id: number;
  deviceKey: string;
  kind: DeviceKind;
  name: string;
  machineId: number | null;
  machineName: string | null;
  gatekeeperId: number;
  active: boolean;
  lockMethod: LockMethod | null;
  idlePowerWatts: number | null;
  idleMinutes: number | null;
  maxSessionMinutes: number | null;
  /** Relay stations: how long the start button works after an allowed tap. */
  relayStartWindowSeconds: number | null;
  checkInRequired: boolean;
  networkAddress: string | null;
  lastHeartbeatAt: string | null;
  healthStatus: DeviceHealthStatus | null;
  healthDetail: string | null;
  keyRotatedAt: string | null;
  createdAt: string;
}

/** The key is in this response and nowhere else (null for a plug, which has none). */
export interface DeviceSecret {
  device: AccessDevice;
  key: string | null;
}

export interface CreateDeviceBody {
  deviceKey: string;
  kind: DeviceKind;
  name: string;
  machineId?: number;
  gatekeeperId?: number;
  lockMethod?: LockMethod;
  idlePowerWatts?: number;
  idleMinutes?: number;
  maxSessionMinutes?: number;
  relayStartWindowSeconds?: number;
  checkInRequired?: boolean;
  networkAddress?: string;
}

/** On update, 0 for `idleMinutes` or `maxSessionMinutes` clears it, and a blank `networkAddress` clears the address. */
export interface UpdateDeviceBody {
  name?: string;
  active?: boolean;
  lockMethod?: LockMethod;
  idlePowerWatts?: number;
  idleMinutes?: number;
  maxSessionMinutes?: number;
  relayStartWindowSeconds?: number;
  checkInRequired?: boolean;
  networkAddress?: string;
}

export interface AccessMachine {
  id: number;
  name: string;
  slug: string;
  location: string | null;
  active: boolean;
}

export interface AccessStudent {
  studentNumber: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface CardLink {
  id: number;
  uid: string;
  studentNumber: number;
  linkedAt: string;
  source: CardLinkSource;
  active: boolean;
  deactivatedAt: string | null;
  deactivatedReason: string | null;
}

export interface LiveVisit {
  id: number;
  studentNumber: number;
  firstName: string | null;
  lastName: string | null;
  startedAt: string;
}

/** No energy field: the gatekeeper reports energy only when a session ends. */
export interface LiveSession {
  id: number;
  studentNumber: number;
  firstName: string | null;
  lastName: string | null;
  machineId: number;
  machineName: string | null;
  startedAt: string;
}

export interface LiveAccess {
  generatedAt: string;
  visits: LiveVisit[];
  sessions: LiveSession[];
}
