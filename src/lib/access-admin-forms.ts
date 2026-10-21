import { slugify } from '@/lib/training-admin-format';
import type {
  AccessDevice,
  CreateDeviceBody,
  DeviceKind,
  Gatekeeper,
  GatekeeperBody,
  LockMethod,
  UpdateDeviceBody,
} from '@/types/access-admin';

/** The defaults the server uses, shown beside each gatekeeper setting (docs/specs/access-gatekeeper.md section 7). */
export const GATEKEEPER_DEFAULTS = {
  pollIntervalSeconds: 30,
  nightlyResetTime: '03:00',
  tapDebounceSeconds: 3,
  reconcileMinutes: 60,
} as const;

/** Relay stations: the start button works this long after an allowed tap (server default 20, allowed 5 to 120). */
export const RELAY_START_WINDOW_DEFAULT = 20;

/** The device key rule of the server: 2 to 63 characters, lowercase letters, digits, '.', '_' or '-'. */
export const DEVICE_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{1,62}$/;
export const DEVICE_KEY_HELP =
  'The name the card reader or gatekeeper uses for this device: lowercase letters, digits, dots, dashes or underscores, for example laser-1-station. It cannot be changed later.';

export function deviceKeyFromName(name: string): string {
  return slugify(name).slice(0, 63);
}

export type FormErrors<T extends string> = Partial<Record<T, string>>;

const WHOLE_NUMBER = /^\d+$/;
const DECIMAL = /^\d+(\.\d+)?$/;
const NIGHTLY_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---------------------------------------------------------------------------------------------------------- gatekeeper

export interface GatekeeperForm {
  name: string;
  active: boolean;
  pollIntervalSeconds: string;
  /** Blank means trust the local copy forever. */
  maxOfflineTrustHours: string;
  nightlyResetTime: string;
  tapDebounceSeconds: string;
  reconcileMinutes: string;
}

export type GatekeeperField = keyof GatekeeperForm;

export function gatekeeperFormFrom(gatekeeper: Gatekeeper | null): GatekeeperForm {
  return {
    name: gatekeeper?.name ?? '',
    active: gatekeeper?.active ?? true,
    pollIntervalSeconds: String(
      gatekeeper?.pollIntervalSeconds ?? GATEKEEPER_DEFAULTS.pollIntervalSeconds,
    ),
    maxOfflineTrustHours:
      gatekeeper?.maxOfflineTrustHours != null ? String(gatekeeper.maxOfflineTrustHours) : '',
    nightlyResetTime: gatekeeper?.nightlyResetTime ?? GATEKEEPER_DEFAULTS.nightlyResetTime,
    tapDebounceSeconds: String(
      gatekeeper?.tapDebounceSeconds ?? GATEKEEPER_DEFAULTS.tapDebounceSeconds,
    ),
    reconcileMinutes: String(gatekeeper?.reconcileMinutes ?? GATEKEEPER_DEFAULTS.reconcileMinutes),
  };
}

export function validateGatekeeperForm(form: GatekeeperForm): FormErrors<GatekeeperField> {
  const errors: FormErrors<GatekeeperField> = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Give the gatekeeper a name, for example "Makerspace PC".';
  else if (name.length > 100) errors.name = 'Use at most 100 characters.';

  const poll = form.pollIntervalSeconds.trim();
  if (!WHOLE_NUMBER.test(poll) || Number(poll) < 5 || Number(poll) > 3600) {
    errors.pollIntervalSeconds = 'Enter a whole number of seconds from 5 to 3600.';
  }
  const trust = form.maxOfflineTrustHours.trim();
  if (trust !== '' && (!WHOLE_NUMBER.test(trust) || Number(trust) < 1)) {
    errors.maxOfflineTrustHours = 'Enter a whole number of hours (1 or more), or leave it empty.';
  }
  if (!NIGHTLY_TIME.test(form.nightlyResetTime.trim())) {
    errors.nightlyResetTime = 'Enter a time of day, for example 03:00.';
  }
  const debounce = form.tapDebounceSeconds.trim();
  if (!WHOLE_NUMBER.test(debounce) || Number(debounce) > 60) {
    errors.tapDebounceSeconds = 'Enter a whole number of seconds from 0 to 60.';
  }
  const reconcile = form.reconcileMinutes.trim();
  if (!WHOLE_NUMBER.test(reconcile) || Number(reconcile) < 5 || Number(reconcile) > 1440) {
    errors.reconcileMinutes = 'Enter a whole number of minutes from 5 to 1440.';
  }
  return errors;
}

/** The request body. When changing a gatekeeper, an emptied trust limit is sent as 0, which clears it. */
export function gatekeeperBodyFrom(
  form: GatekeeperForm,
  existing: Gatekeeper | null,
): GatekeeperBody {
  const trust = form.maxOfflineTrustHours.trim();
  const body: GatekeeperBody = {
    name: form.name.trim(),
    pollIntervalSeconds: Number(form.pollIntervalSeconds),
    nightlyResetTime: form.nightlyResetTime.trim(),
    tapDebounceSeconds: Number(form.tapDebounceSeconds),
    reconcileMinutes: Number(form.reconcileMinutes),
  };
  if (trust !== '') body.maxOfflineTrustHours = Number(trust);
  else if (existing?.maxOfflineTrustHours != null) body.maxOfflineTrustHours = 0;
  if (existing) body.active = form.active;
  return body;
}

// ------------------------------------------------------------------------------------------------------------- device

export interface DeviceForm {
  kind: DeviceKind;
  deviceKey: string;
  name: string;
  machineId: string;
  gatekeeperId: string;
  active: boolean;
  lockMethod: LockMethod;
  idlePowerWatts: string;
  idleMinutes: string;
  /** Off by default: a running machine is never cut by a timer. */
  limitSession: boolean;
  maxSessionMinutes: string;
  relayStartWindowSeconds: string;
  checkInRequired: boolean;
  networkAddress: string;
}

export type DeviceField = keyof DeviceForm;

export function deviceFormFrom(
  device: AccessDevice | null,
  kind: DeviceKind = 'STATION',
): DeviceForm {
  return {
    kind: device?.kind ?? kind,
    deviceKey: device?.deviceKey ?? '',
    name: device?.name ?? '',
    machineId: device?.machineId != null ? String(device.machineId) : '',
    gatekeeperId: device?.gatekeeperId != null ? String(device.gatekeeperId) : '',
    active: device?.active ?? true,
    lockMethod: device?.lockMethod ?? 'PLUG',
    idlePowerWatts: device?.idlePowerWatts != null ? String(device.idlePowerWatts) : '',
    idleMinutes: device?.idleMinutes != null ? String(device.idleMinutes) : '',
    limitSession: device?.maxSessionMinutes != null,
    maxSessionMinutes: device?.maxSessionMinutes != null ? String(device.maxSessionMinutes) : '',
    relayStartWindowSeconds: String(device?.relayStartWindowSeconds ?? RELAY_START_WINDOW_DEFAULT),
    checkInRequired: device?.checkInRequired ?? true,
    networkAddress: device?.networkAddress ?? '',
  };
}

/** Whether the idle level and idle time apply: only for machines locked by a smart plug. */
export function usesIdleDetection(form: Pick<DeviceForm, 'kind' | 'lockMethod'>): boolean {
  return form.kind === 'STATION' && form.lockMethod === 'PLUG';
}

/** Whether the start window applies: only for machines whose start circuit is switched by a relay. */
export function usesRelayWindow(form: Pick<DeviceForm, 'kind' | 'lockMethod'>): boolean {
  return form.kind === 'STATION' && form.lockMethod === 'RELAY';
}

export function validateDeviceForm(
  form: DeviceForm,
  { isNew }: { isNew: boolean },
): FormErrors<DeviceField> {
  const errors: FormErrors<DeviceField> = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Give the device a name, for example "Laser 1 card reader".';
  else if (name.length > 120) errors.name = 'Use at most 120 characters.';

  if (form.gatekeeperId === '') errors.gatekeeperId = 'Choose the gatekeeper this device talks to.';

  if (isNew) {
    if (!DEVICE_KEY_PATTERN.test(form.deviceKey.trim())) {
      errors.deviceKey =
        'Use 2 to 63 characters: lowercase letters, digits, dots, dashes or underscores.';
    }
    if (form.kind !== 'KIOSK' && form.machineId === '') {
      errors.machineId = 'Choose the machine this device belongs to.';
    }
  }

  if (usesIdleDetection(form)) {
    const watts = form.idlePowerWatts.trim();
    if (!DECIMAL.test(watts) || Number(watts) > 99999) {
      errors.idlePowerWatts = 'Enter the power level in watts, for example 5.';
    }
    const minutes = form.idleMinutes.trim();
    if (!WHOLE_NUMBER.test(minutes) || Number(minutes) < 1) {
      errors.idleMinutes = 'Enter a whole number of minutes (1 or more).';
    }
  }
  if (usesRelayWindow(form)) {
    const window = form.relayStartWindowSeconds.trim();
    if (!WHOLE_NUMBER.test(window) || Number(window) < 5 || Number(window) > 120) {
      errors.relayStartWindowSeconds = 'Enter a whole number of seconds from 5 to 120.';
    }
  }
  if (form.kind === 'STATION' && form.limitSession) {
    const max = form.maxSessionMinutes.trim();
    if (!WHOLE_NUMBER.test(max) || Number(max) < 1) {
      errors.maxSessionMinutes = 'Enter a whole number of minutes (1 or more).';
    }
  }
  return errors;
}

export function createDeviceBodyFrom(form: DeviceForm): CreateDeviceBody {
  const body: CreateDeviceBody = {
    deviceKey: form.deviceKey.trim(),
    kind: form.kind,
    name: form.name.trim(),
    gatekeeperId: Number(form.gatekeeperId),
  };
  if (form.kind !== 'KIOSK') body.machineId = Number(form.machineId);
  if (form.kind === 'STATION') {
    body.checkInRequired = form.checkInRequired;
    body.lockMethod = form.lockMethod;
    if (usesIdleDetection(form)) {
      body.idlePowerWatts = Number(form.idlePowerWatts);
      body.idleMinutes = Number(form.idleMinutes);
    }
    if (usesRelayWindow(form)) body.relayStartWindowSeconds = Number(form.relayStartWindowSeconds);
    if (form.limitSession) body.maxSessionMinutes = Number(form.maxSessionMinutes);
  }
  if (form.kind === 'PLUG' && form.networkAddress.trim()) {
    body.networkAddress = form.networkAddress.trim();
  }
  return body;
}

/** What changes on an existing device. Turning the session limit off is sent as 0, which clears it. */
export function updateDeviceBodyFrom(form: DeviceForm): UpdateDeviceBody {
  const body: UpdateDeviceBody = {
    name: form.name.trim(),
    active: form.active,
  };
  if (form.kind === 'STATION') {
    body.checkInRequired = form.checkInRequired;
    body.lockMethod = form.lockMethod;
    if (usesIdleDetection(form)) {
      body.idlePowerWatts = Number(form.idlePowerWatts);
      body.idleMinutes = Number(form.idleMinutes);
    }
    if (usesRelayWindow(form)) body.relayStartWindowSeconds = Number(form.relayStartWindowSeconds);
    body.maxSessionMinutes = form.limitSession ? Number(form.maxSessionMinutes) : 0;
  }
  if (form.kind === 'PLUG') body.networkAddress = form.networkAddress.trim();
  return body;
}

// ------------------------------------------------------------------------------------------------------- card unlink

export const UNLINK_REASON_MAX = 200;

/** A card can only be closed with a reason, for example "lost card". */
export function validateUnlinkReason(reason: string): string | null {
  const text = reason.trim();
  if (!text) return 'Say why, for example "lost card". It is kept in the record.';
  if (text.length > UNLINK_REASON_MAX) return `Use at most ${UNLINK_REASON_MAX} characters.`;
  return null;
}
