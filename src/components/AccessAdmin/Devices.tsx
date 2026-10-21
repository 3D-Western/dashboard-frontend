'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { accessAdminAPI } from '@/api/client/access-admin';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckField, SelectField, TextField } from '@/components/TrainingAdmin/fields';
import { ErrorNote, LoadState, ServerProblems } from '@/components/TrainingAdmin/feedback';
import { useAdminResource } from '@/hooks/useAdminResource';
import { useGuardedClose } from '@/hooks/useGuardedClose';
import { useNow } from '@/hooks/useNow';
import {
  createDeviceBodyFrom,
  deviceFormFrom,
  deviceKeyFromName,
  DEVICE_KEY_HELP,
  RELAY_START_WINDOW_DEFAULT,
  updateDeviceBodyFrom,
  usesIdleDetection,
  usesRelayWindow,
  usesSessionLimit,
  validateDeviceForm,
  type DeviceField,
  type DeviceForm,
} from '@/lib/access-admin-forms';
import {
  DEVICE_KIND_HELP,
  DEVICE_KIND_LABELS,
  LOCK_METHOD_HELP,
  LOCK_METHOD_LABELS,
  deviceStatus,
  formatAgo,
  idleSummary,
} from '@/lib/access-admin-format';
import { adminErrorMessage, issuesFor, issuesFromError } from '@/lib/training-admin-errors';
import type {
  AccessDevice,
  AccessMachine,
  DeviceKind,
  Gatekeeper,
  LockMethod,
} from '@/types/access-admin';
import { SecretDialog } from './SecretDialog';
import { StatusBadge } from './StatusBadge';

type Editing = { device: AccessDevice | null; kind?: DeviceKind; machineId?: number };

/** /admin/access/devices: kiosks, card readers and smart plugs, grouped by the machine they serve. */
export function Devices() {
  const loadDevices = useCallback(() => accessAdminAPI.listDevices(), []);
  const loadMachines = useCallback(() => accessAdminAPI.listMachines(), []);
  const loadGatekeepers = useCallback(() => accessAdminAPI.listGatekeepers(), []);
  const devices = useAdminResource(loadDevices);
  const machines = useAdminResource(loadMachines);
  const gatekeepers = useAdminResource(loadGatekeepers);
  const now = useNow();
  const [gatekeeperFilter, setGatekeeperFilter] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [rotating, setRotating] = useState<AccessDevice | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ title: string; key: string } | null>(null);

  const reloadAll = async () => {
    await Promise.all([devices.reload(), machines.reload(), gatekeepers.reload()]);
  };

  const visible = useMemo(
    () =>
      (devices.data ?? []).filter(
        (device) => gatekeeperFilter === '' || String(device.gatekeeperId) === gatekeeperFilter,
      ),
    [devices.data, gatekeeperFilter],
  );
  const kiosks = visible.filter((device) => device.kind === 'KIOSK');
  const byMachine = useMemo(() => {
    const groups = new Map<number, AccessDevice[]>();
    visible
      .filter((device) => device.machineId !== null)
      .forEach((device) => {
        const list = groups.get(device.machineId as number) ?? [];
        list.push(device);
        groups.set(device.machineId as number, list);
      });
    return groups;
  }, [visible]);
  const machineName = (id: number) =>
    machines.data?.find((m) => m.id === id)?.name ??
    byMachine.get(id)?.[0]?.machineName ??
    `Machine ${id}`;
  const machineIdsWithDevices = [...byMachine.keys()].sort((a, b) =>
    machineName(a).localeCompare(machineName(b)),
  );
  const bareMachines = (machines.data ?? []).filter(
    (m) => m.active && !(devices.data ?? []).some((d) => d.machineId === m.id),
  );

  const rotate = async () => {
    if (!rotating) return;
    setRotateError(null);
    try {
      const result = await accessAdminAPI.rotateDeviceKey(rotating.id);
      setRotating(null);
      if (result.key) setSecret({ title: `New key for ${rotating.name}`, key: result.key });
      await devices.reload();
    } catch (error) {
      setRotateError(adminErrorMessage(error, "We couldn't rotate that key."));
    }
  };

  const gatekeeperName = (id: number | null) =>
    gatekeepers.data?.find((g) => g.id === id)?.name ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          Every device talks to one gatekeeper. A machine has one card reader (which holds the
          machine’s settings) and, for smart-plug machines, one plug. The kiosk at the entrance
          belongs to no machine.
        </p>
        <Button type="button" onClick={() => setEditing({ device: null })}>
          <Plus /> Add a device
        </Button>
      </div>

      {(gatekeepers.data?.length ?? 0) > 1 && (
        <SelectField
          label="Show devices of"
          value={gatekeeperFilter}
          onValueChange={setGatekeeperFilter}
          options={(gatekeepers.data ?? []).map((g) => ({ value: String(g.id), label: g.name }))}
          placeholder="All gatekeepers"
          className="max-w-xs"
        />
      )}

      <LoadState
        isLoading={devices.isLoading || machines.isLoading}
        error={devices.error ?? machines.error}
        hasData={!!devices.data && !!machines.data}
        onRetry={() => void reloadAll()}
        what="the devices"
      >
        {(devices.data?.length ?? 0) === 0 && (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No devices yet. Register a gatekeeper first, then add the kiosk and a card reader for
            each machine.
          </p>
        )}
        {devices.data && devices.data.length > 0 && visible.length === 0 && (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            That gatekeeper has no devices yet.
          </p>
        )}

        {kiosks.length > 0 && (
          <section className="space-y-2" aria-label="Kiosks">
            <h2 className="text-lg font-semibold">Kiosks</h2>
            <ul className="space-y-3">
              {kiosks.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  now={now}
                  gatekeeperName={gatekeeperName(device.gatekeeperId)}
                  onEdit={() => setEditing({ device })}
                  onRotate={() => {
                    setRotateError(null);
                    setRotating(device);
                  }}
                />
              ))}
            </ul>
          </section>
        )}

        {machineIdsWithDevices.map((id) => (
          <section key={id} className="mt-6 space-y-2" aria-label={machineName(id)}>
            <h2 className="text-lg font-semibold">{machineName(id)}</h2>
            <ul className="space-y-3">
              {(byMachine.get(id) ?? [])
                .sort((a, b) => a.kind.localeCompare(b.kind))
                .map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    now={now}
                    gatekeeperName={gatekeeperName(device.gatekeeperId)}
                    onEdit={() => setEditing({ device })}
                    onRotate={() => {
                      setRotateError(null);
                      setRotating(device);
                    }}
                  />
                ))}
            </ul>
          </section>
        ))}

        {gatekeeperFilter === '' && bareMachines.length > 0 && (
          <section className="mt-6 space-y-2" aria-label="Machines without devices">
            <h2 className="text-lg font-semibold">Machines without a card reader</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {bareMachines.map((machine) => (
                <li
                  key={machine.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3"
                >
                  <span className="font-medium">{machine.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={`Add a card reader to ${machine.name}`}
                    onClick={() =>
                      setEditing({ device: null, kind: 'STATION', machineId: machine.id })
                    }
                  >
                    <Plus /> Add card reader
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </LoadState>

      <AlertDialog open={rotating !== null} onOpenChange={(open) => !open && setRotating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate the key for {rotating?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The old key stops working as soon as the gatekeeper has the change (a few seconds).
              You will see the new key once, and it has to be put into the device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ErrorNote message={rotateError} />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the current key</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void rotate();
              }}
            >
              Rotate key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing && machines.data && gatekeepers.data && devices.data && (
        <DeviceDialog
          device={editing.device}
          initialKind={editing.kind}
          initialMachineId={editing.machineId}
          machines={machines.data}
          gatekeepers={gatekeepers.data}
          devices={devices.data}
          defaultGatekeeperId={gatekeeperFilter === '' ? null : Number(gatekeeperFilter)}
          onClose={() => setEditing(null)}
          onSaved={async (key, deviceName) => {
            const wasNew = editing.device === null;
            setEditing(null);
            if (key) setSecret({ title: `Key for ${deviceName}`, key });
            else toast.success(wasNew ? 'Device added.' : 'Device saved.');
            await reloadAll();
          }}
        />
      )}

      {secret && (
        <SecretDialog
          title={secret.title}
          secretLabel="Device key"
          secret={secret.key}
          description="Put this key into the device (for a card reader, in its firmware settings). The device sends it with every tap to prove who it is."
          onDone={() => setSecret(null)}
        />
      )}
    </div>
  );
}

function DeviceCard({
  device,
  now,
  gatekeeperName,
  onEdit,
  onRotate,
}: {
  device: AccessDevice;
  now: number;
  gatekeeperName: string | null;
  onEdit: () => void;
  onRotate: () => void;
}) {
  const status = deviceStatus(device, now);
  const idle = idleSummary(device);
  return (
    <li className="space-y-2 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 font-semibold">
            {device.name}
            <Badge variant="secondary">{DEVICE_KIND_LABELS[device.kind]}</Badge>
            <StatusBadge status={status} />
          </h3>
          <p className="font-mono text-xs text-muted-foreground">{device.deviceKey}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={`Edit ${device.name}`}
            onClick={onEdit}
          >
            Edit
          </Button>
          {device.kind !== 'PLUG' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Rotate key for ${device.name}`}
              onClick={onRotate}
            >
              Rotate key
            </Button>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <Row label="Last heartbeat" value={formatAgo(device.lastHeartbeatAt, now)} />
        {gatekeeperName && <Row label="Gatekeeper" value={gatekeeperName} />}
        {device.healthDetail && <Row label="Detail" value={device.healthDetail} />}
        {device.kind === 'STATION' && (
          <>
            <Row
              label="Locked by"
              value={device.lockMethod ? LOCK_METHOD_LABELS[device.lockMethod] : 'Not set'}
            />
            {idle && <Row label="Idle rule" value={idle} />}
            {device.lockMethod === 'RELAY' && device.relayStartWindowSeconds !== null && (
              <Row label="Start window" value={`${device.relayStartWindowSeconds} s after a tap`} />
            )}
            {device.lockMethod !== 'RELAY' && (
              <Row
                label="Session length"
                value={
                  device.maxSessionMinutes
                    ? `Limit of ${device.maxSessionMinutes} min (never cuts a running machine)`
                    : 'No maximum'
                }
              />
            )}
            <Row label="Check-in" value={device.checkInRequired ? 'Required' : 'Not required'} />
          </>
        )}
        {device.kind === 'PLUG' && (
          <Row label="Address" value={device.networkAddress ?? 'Not set'} />
        )}
      </dl>
      {device.kind === 'PLUG' && (
        <p className="text-xs text-muted-foreground">
          When this machine counts as off is set on its card reader.
        </p>
      )}
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

const KIND_OPTIONS = (Object.keys(DEVICE_KIND_LABELS) as DeviceKind[]).map((kind) => ({
  value: kind,
  label: DEVICE_KIND_LABELS[kind],
}));
const LOCK_OPTIONS = (Object.keys(LOCK_METHOD_LABELS) as LockMethod[]).map((method) => ({
  value: method,
  label: LOCK_METHOD_LABELS[method],
}));

const SERVER_FIELDS = [
  'name',
  'deviceKey',
  'kind',
  'machineId',
  'gatekeeperId',
  'lockMethod',
  'idlePowerWatts',
  'idleMinutes',
  'maxSessionMinutes',
  'relayStartWindowSeconds',
  'networkAddress',
];

function DeviceDialog({
  device,
  initialKind,
  initialMachineId,
  machines,
  gatekeepers,
  devices,
  defaultGatekeeperId,
  onClose,
  onSaved,
}: {
  device: AccessDevice | null;
  initialKind?: DeviceKind;
  initialMachineId?: number;
  machines: AccessMachine[];
  gatekeepers: Gatekeeper[];
  devices: AccessDevice[];
  defaultGatekeeperId: number | null;
  onClose: () => void;
  /** The key is passed only for a newly added kiosk or card reader. */
  onSaved: (key: string | null, deviceName: string) => Promise<void>;
}) {
  const isNew = device === null;
  const [form, setForm] = useState<DeviceForm>(() => {
    const initial = deviceFormFrom(device, initialKind);
    if (initialMachineId !== undefined) initial.machineId = String(initialMachineId);
    if (isNew) {
      const preferred =
        defaultGatekeeperId ?? (gatekeepers.length === 1 ? gatekeepers[0].id : null);
      initial.gatekeeperId = preferred !== null ? String(preferred) : '';
    }
    return initial;
  });
  const [keyTouched, setKeyTouched] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<ReturnType<typeof issuesFromError>>([]);
  const [failure, setFailure] = useState<string | null>(null);

  const set = <K extends DeviceField>(field: K, value: DeviceForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));
  const local = showErrors ? validateDeviceForm(form, { isNew }) : {};
  const errorsFor = (field: DeviceField) =>
    [local[field], ...issuesFor(problems, field).map((p) => p.message)].filter(
      (m): m is string => !!m,
    );

  const machineOptions = machines.map((machine) => {
    const taken = devices.some((d) => d.kind === form.kind && d.machineId === machine.id);
    const label = `${machine.name}${machine.active ? '' : ' (inactive)'}${
      taken ? ` (already has a ${DEVICE_KIND_LABELS[form.kind].toLowerCase()})` : ''
    }`;
    return { value: String(machine.id), label, disabled: taken };
  });

  const save = async () => {
    if (Object.keys(validateDeviceForm(form, { isNew })).length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setFailure(null);
    setProblems([]);
    try {
      if (device) {
        await accessAdminAPI.updateDevice(device.id, updateDeviceBodyFrom(form));
        await onSaved(null, form.name.trim());
      } else {
        const result = await accessAdminAPI.registerDevice(createDeviceBodyFrom(form));
        await onSaved(result.key, result.device.name);
      }
    } catch (error) {
      setProblems(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't save that device."));
    } finally {
      setSaving(false);
    }
  };

  const { requestClose, guard } = useGuardedClose(form, onClose);
  const machineLabel =
    device?.machineName ?? machines.find((m) => String(m.id) === form.machineId)?.name;

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{device ? `Edit ${device.name}` : 'Add a device'}</DialogTitle>
          <DialogDescription>
            {DEVICE_KIND_HELP[form.kind]} Changes reach the gatekeeper within a few seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isNew ? (
            <SelectField
              label="Type"
              value={form.kind}
              onValueChange={(value) => set('kind', value as DeviceKind)}
              options={KIND_OPTIONS}
              error={errorsFor('kind')}
            />
          ) : (
            <p className="text-sm">
              <span className="text-muted-foreground">Type:</span> {DEVICE_KIND_LABELS[form.kind]}
              {machineLabel && (
                <>
                  {' · '}
                  <span className="text-muted-foreground">Machine:</span> {machineLabel}
                </>
              )}
              {' · '}
              <span className="text-muted-foreground">Gatekeeper:</span>{' '}
              {gatekeepers.find((g) => g.id === device?.gatekeeperId)?.name ?? 'Unknown'}
            </p>
          )}

          {isNew && form.kind !== 'KIOSK' && (
            <SelectField
              label="Machine"
              value={form.machineId}
              onValueChange={(value) => set('machineId', value)}
              options={machineOptions}
              placeholder="Choose a machine"
              help="The machine this device serves. A machine has one card reader and one plug."
              error={errorsFor('machineId')}
            />
          )}

          {isNew && (
            <SelectField
              label="Gatekeeper"
              value={form.gatekeeperId}
              onValueChange={(value) => set('gatekeeperId', value)}
              options={gatekeepers.map((g) => ({ value: String(g.id), label: g.name }))}
              placeholder="Choose a gatekeeper"
              help="The PC this device talks to. A gatekeeper only sees its own devices, and this cannot be changed later."
              error={errorsFor('gatekeeperId')}
            />
          )}

          <TextField
            label="Name"
            value={form.name}
            onValueChange={(value) => {
              set('name', value);
              if (isNew && !keyTouched) set('deviceKey', deviceKeyFromName(value));
            }}
            placeholder="Laser 1 card reader"
            error={errorsFor('name')}
          />

          {isNew && (
            <TextField
              label="Device ID"
              value={form.deviceKey}
              onValueChange={(value) => {
                setKeyTouched(true);
                set('deviceKey', value);
              }}
              help={DEVICE_KEY_HELP}
              error={errorsFor('deviceKey')}
              className="[&_input]:font-mono"
            />
          )}

          {form.kind === 'STATION' && (
            <>
              <SelectField
                label="How the machine is locked"
                value={form.lockMethod}
                onValueChange={(value) => set('lockMethod', value as LockMethod)}
                options={LOCK_OPTIONS}
                help={LOCK_METHOD_HELP[form.lockMethod]}
                error={errorsFor('lockMethod')}
              />
              {usesIdleDetection(form) && (
                <fieldset className="space-y-3 rounded-lg border p-3">
                  <legend className="px-1 text-sm font-medium">
                    When the machine counts as off
                  </legend>
                  <p className="text-xs text-muted-foreground">
                    The machine counts as off when it draws under this power level for this long.
                    The session then ends and the plug switches off. Set it generously for laser
                    cutters, so the chiller and exhaust finish first; measure each machine before
                    use.
                  </p>
                  <TextField
                    label="Idle power level (watts)"
                    inputMode="decimal"
                    value={form.idlePowerWatts}
                    onValueChange={(value) => set('idlePowerWatts', value)}
                    help="Draw below this counts as idle, for example 5."
                    error={errorsFor('idlePowerWatts')}
                  />
                  <TextField
                    label="Idle time (minutes)"
                    inputMode="numeric"
                    value={form.idleMinutes}
                    onValueChange={(value) => set('idleMinutes', value)}
                    help="How long it must stay idle before the session ends, for example 15."
                    error={errorsFor('idleMinutes')}
                  />
                </fieldset>
              )}
              {usesRelayWindow(form) && (
                <TextField
                  label="Start window (seconds)"
                  inputMode="numeric"
                  value={form.relayStartWindowSeconds}
                  onValueChange={(value) => set('relayStartWindowSeconds', value)}
                  hint={`Default: ${RELAY_START_WINDOW_DEFAULT}`}
                  help="After an allowed tap, the start button works for this many seconds; the machine keeps running once started."
                  error={errorsFor('relayStartWindowSeconds')}
                />
              )}
              {usesSessionLimit(form) && (
                <div className="space-y-3">
                  <CheckField
                    label="Limit how long one session can last"
                    checked={form.limitSession}
                    onCheckedChange={(value) => set('limitSession', value)}
                    help="Off by default. This never cuts a running machine, so a 20-hour print is safe; the limit only stops new starts or raises a warning."
                  />
                  {form.limitSession && (
                    <TextField
                      label="Longest session (minutes)"
                      inputMode="numeric"
                      value={form.maxSessionMinutes}
                      onValueChange={(value) => set('maxSessionMinutes', value)}
                      error={errorsFor('maxSessionMinutes')}
                    />
                  )}
                </div>
              )}
              <CheckField
                label="Check-in required"
                checked={form.checkInRequired}
                onCheckedChange={(value) => set('checkInRequired', value)}
                help="People must be checked in at the kiosk (an open visit today) before this machine lets them in."
              />
            </>
          )}

          {form.kind === 'PLUG' && (
            <TextField
              label="Plug address"
              value={form.networkAddress}
              onValueChange={(value) => set('networkAddress', value)}
              placeholder="192.168.1.50"
              help="The plug’s address on the reader network. The gatekeeper uses it to switch the plug and read its power. When the machine counts as off is set on the machine’s card reader."
              error={errorsFor('networkAddress')}
            />
          )}

          {device && (
            <CheckField
              label="Active"
              checked={form.active}
              onCheckedChange={(value) => set('active', value)}
              help="An inactive device is ignored by the gatekeeper."
            />
          )}
          <ServerProblems issues={problems} failure={failure} claimedFields={SERVER_FIELDS} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving...' : device ? 'Save device' : 'Add device'}
          </Button>
        </DialogFooter>
        {guard}
      </DialogContent>
    </Dialog>
  );
}
