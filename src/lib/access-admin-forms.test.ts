import { describe, it, expect } from 'vitest';
import { createDevice, createGatekeeper } from '@test/utils/accessAdminFactories';
import {
  createDeviceBodyFrom,
  deviceFormFrom,
  deviceKeyFromName,
  gatekeeperBodyFrom,
  gatekeeperFormFrom,
  updateDeviceBodyFrom,
  usesIdleDetection,
  validateDeviceForm,
  validateGatekeeperForm,
  validateUnlinkReason,
} from './access-admin-forms';

describe('gatekeeper form', () => {
  it('starts with the defaults for a new gatekeeper', () => {
    const form = gatekeeperFormFrom(null);

    expect(form).toMatchObject({
      name: '',
      pollIntervalSeconds: '30',
      maxOfflineTrustHours: '',
      nightlyResetTime: '03:00',
      tapDebounceSeconds: '3',
    });
    expect(Object.keys(validateGatekeeperForm(form))).toEqual(['name']);
  });

  it('refuses out-of-range and malformed settings', () => {
    const form = {
      ...gatekeeperFormFrom(null),
      name: ' ',
      pollIntervalSeconds: '4',
      maxOfflineTrustHours: '0',
      nightlyResetTime: '25:00',
      tapDebounceSeconds: '61',
      reconcileMinutes: '2',
    };

    expect(Object.keys(validateGatekeeperForm(form)).sort()).toEqual([
      'maxOfflineTrustHours',
      'name',
      'nightlyResetTime',
      'pollIntervalSeconds',
      'reconcileMinutes',
      'tapDebounceSeconds',
    ]);
    expect(validateGatekeeperForm({ ...form, name: 'x'.repeat(101) }).name).toMatch(/100/);
  });

  it('accepts a valid form and sends the trimmed values', () => {
    const form = {
      ...gatekeeperFormFrom(null),
      name: '  Makerspace PC ',
      maxOfflineTrustHours: '48',
    };

    expect(validateGatekeeperForm(form)).toEqual({});
    expect(gatekeeperBodyFrom(form, null)).toEqual({
      name: 'Makerspace PC',
      pollIntervalSeconds: 30,
      maxOfflineTrustHours: 48,
      nightlyResetTime: '03:00',
      tapDebounceSeconds: 3,
      reconcileMinutes: 60,
    });
  });

  it('clears an existing trust limit with 0 when the field is emptied, and carries the active flag', () => {
    const existing = createGatekeeper({ maxOfflineTrustHours: 24 });
    const form = { ...gatekeeperFormFrom(existing), maxOfflineTrustHours: '', active: false };

    const body = gatekeeperBodyFrom(form, existing);

    expect(body.maxOfflineTrustHours).toBe(0);
    expect(body.active).toBe(false);
    expect(
      gatekeeperBodyFrom(gatekeeperFormFrom(createGatekeeper()), createGatekeeper()),
    ).not.toHaveProperty('maxOfflineTrustHours');
  });
});

describe('device form', () => {
  const station = () => ({
    ...deviceFormFrom(null, 'STATION'),
    gatekeeperId: '1',
    name: 'Laser 1 card reader',
    deviceKey: 'laser-1-station',
    machineId: '5',
    idlePowerWatts: '12.5',
    idleMinutes: '15',
  });

  it('makes a device id from the name', () => {
    expect(deviceKeyFromName('Laser 1 Card Reader!')).toBe('laser-1-card-reader');
  });

  it('needs a name, a gatekeeper, an id and a machine for a new card reader', () => {
    const errors = validateDeviceForm(deviceFormFrom(null, 'STATION'), { isNew: true });

    expect(Object.keys(errors).sort()).toEqual([
      'deviceKey',
      'gatekeeperId',
      'idleMinutes',
      'idlePowerWatts',
      'machineId',
      'name',
    ]);
  });

  it('needs no machine for a kiosk and no idle rule unless a plug locks the machine', () => {
    const kiosk = {
      ...deviceFormFrom(null, 'KIOSK'),
      gatekeeperId: '1',
      name: 'Entrance',
      deviceKey: 'kiosk-1',
    };
    const relay = {
      ...station(),
      lockMethod: 'RELAY' as const,
      idlePowerWatts: '',
      idleMinutes: '',
    };

    expect(validateDeviceForm(kiosk, { isNew: true })).toEqual({});
    expect(usesIdleDetection(relay)).toBe(false);
    expect(validateDeviceForm(relay, { isNew: true })).toEqual({});
    expect(usesIdleDetection(station())).toBe(true);
  });

  it('checks the idle level, the idle time and the optional session limit', () => {
    const errors = validateDeviceForm(
      {
        ...station(),
        idlePowerWatts: '-3',
        idleMinutes: '0',
        limitSession: true,
        maxSessionMinutes: '',
      },
      { isNew: true },
    );

    expect(Object.keys(errors).sort()).toEqual([
      'idleMinutes',
      'idlePowerWatts',
      'maxSessionMinutes',
    ]);
    expect(
      validateDeviceForm(
        { ...station(), limitSession: true, maxSessionMinutes: '600' },
        { isNew: true },
      ),
    ).toEqual({});
  });

  it('refuses a device id the server would refuse', () => {
    expect(
      validateDeviceForm({ ...station(), deviceKey: 'Laser 1' }, { isNew: true }).deviceKey,
    ).toBeDefined();
    expect(
      validateDeviceForm({ ...station(), deviceKey: 'x' }, { isNew: true }).deviceKey,
    ).toBeDefined();
  });

  it('builds the create request for a laser card reader: no session limit unless asked for', () => {
    expect(createDeviceBodyFrom(station())).toEqual({
      deviceKey: 'laser-1-station',
      kind: 'STATION',
      name: 'Laser 1 card reader',
      gatekeeperId: 1,
      machineId: 5,
      checkInRequired: true,
      lockMethod: 'PLUG',
      idlePowerWatts: 12.5,
      idleMinutes: 15,
    });
    expect(
      createDeviceBodyFrom({ ...station(), limitSession: true, maxSessionMinutes: '90' }),
    ).toMatchObject({
      maxSessionMinutes: 90,
    });
  });

  it('builds the create request for a plug and a kiosk', () => {
    const plug = {
      ...deviceFormFrom(null, 'PLUG'),
      gatekeeperId: '1',
      name: 'Laser 1 plug',
      deviceKey: 'laser-1-plug',
      machineId: '5',
      networkAddress: ' 192.168.1.50 ',
    };
    const kiosk = {
      ...deviceFormFrom(null, 'KIOSK'),
      gatekeeperId: '1',
      name: 'Entrance',
      deviceKey: 'kiosk-1',
    };

    expect(createDeviceBodyFrom(plug)).toEqual({
      deviceKey: 'laser-1-plug',
      kind: 'PLUG',
      name: 'Laser 1 plug',
      gatekeeperId: 1,
      machineId: 5,
      networkAddress: '192.168.1.50',
    });
    expect(createDeviceBodyFrom(kiosk)).toEqual({
      deviceKey: 'kiosk-1',
      kind: 'KIOSK',
      name: 'Entrance',
      gatekeeperId: 1,
    });
  });

  it('turns the session limit off with 0 when editing', () => {
    const existing = createDevice({ maxSessionMinutes: 600 });
    const form = { ...deviceFormFrom(existing), limitSession: false };

    expect(updateDeviceBodyFrom(form)).toMatchObject({
      maxSessionMinutes: 0,
      idleMinutes: 15,
      active: true,
    });
    expect(deviceFormFrom(existing).limitSession).toBe(true);
    expect(deviceFormFrom(createDevice()).limitSession).toBe(false);
  });

  it('asks for a start window only on relay stations, between 5 and 120 seconds', () => {
    const relay = { ...station(), lockMethod: 'RELAY' as const };

    expect(relay.relayStartWindowSeconds).toBe('20');
    expect(validateDeviceForm(relay, { isNew: true })).toEqual({});
    expect(
      validateDeviceForm({ ...relay, relayStartWindowSeconds: '4' }, { isNew: true })
        .relayStartWindowSeconds,
    ).toBeDefined();
    expect(
      validateDeviceForm({ ...relay, relayStartWindowSeconds: '121' }, { isNew: true })
        .relayStartWindowSeconds,
    ).toBeDefined();
    expect(createDeviceBodyFrom({ ...relay, relayStartWindowSeconds: '45' })).toMatchObject({
      lockMethod: 'RELAY',
      relayStartWindowSeconds: 45,
    });
    expect(createDeviceBodyFrom(station())).not.toHaveProperty('relayStartWindowSeconds');
    expect(updateDeviceBodyFrom(relay)).toMatchObject({ relayStartWindowSeconds: 20 });
    expect(
      validateDeviceForm({ ...station(), relayStartWindowSeconds: 'x' }, { isNew: true }),
    ).toEqual({});
  });

  it('does not send idle settings when the machine is not locked by a plug', () => {
    const body = updateDeviceBodyFrom({ ...deviceFormFrom(createDevice()), lockMethod: 'RELAY' });

    expect(body).not.toHaveProperty('idleMinutes');
    expect(body.lockMethod).toBe('RELAY');
  });
});

describe('unlink reason', () => {
  it('is required', () => {
    expect(validateUnlinkReason('   ')).toMatch(/why/i);
    expect(validateUnlinkReason('lost card')).toBeNull();
    expect(validateUnlinkReason('x'.repeat(201))).toMatch(/200/);
  });
});
