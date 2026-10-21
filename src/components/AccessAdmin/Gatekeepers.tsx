'use client';

import { useCallback, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckField, TextField } from '@/components/TrainingAdmin/fields';
import { ErrorNote, LoadState, ServerProblems } from '@/components/TrainingAdmin/feedback';
import { useAdminResource } from '@/hooks/useAdminResource';
import { useGuardedClose } from '@/hooks/useGuardedClose';
import { useNow } from '@/hooks/useNow';
import {
  GATEKEEPER_DEFAULTS,
  gatekeeperBodyFrom,
  gatekeeperFormFrom,
  validateGatekeeperForm,
  type GatekeeperField,
  type GatekeeperForm,
} from '@/lib/access-admin-forms';
import {
  formatAgo,
  formatUptime,
  formatWhen,
  gatekeeperStatus,
  healthOf,
} from '@/lib/access-admin-format';
import { adminErrorMessage, issuesFor, issuesFromError } from '@/lib/training-admin-errors';
import type { Gatekeeper } from '@/types/access-admin';
import { SecretDialog } from './SecretDialog';
import { StatusBadge } from './StatusBadge';

const TOKEN_HELP =
  'Put this token in the gatekeeper PC’s configuration. The gatekeeper sends it with every call to prove who it is.';

/** /admin/access/gatekeepers: the PCs that run the readers, with their last health report. */
export function Gatekeepers() {
  const load = useCallback(() => accessAdminAPI.listGatekeepers(), []);
  const gatekeepers = useAdminResource(load);
  const now = useNow();
  const [editing, setEditing] = useState<{ gatekeeper: Gatekeeper | null } | null>(null);
  const [rotating, setRotating] = useState<Gatekeeper | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  // The one place a token lives in the page; clearing it removes it for good.
  const [secret, setSecret] = useState<{ title: string; token: string } | null>(null);

  const rotate = async () => {
    if (!rotating) return;
    setRotateError(null);
    try {
      const result = await accessAdminAPI.rotateGatekeeperToken(rotating.id);
      setRotating(null);
      setSecret({ title: `New token for ${rotating.name}`, token: result.token });
      await gatekeepers.reload();
    } catch (error) {
      setRotateError(adminErrorMessage(error, "We couldn't rotate that token."));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          A gatekeeper is the small service on the makerspace PC that the kiosk and card readers
          talk to. It keeps working from its own copy when the internet is down, and syncs with this
          dashboard when it can.
        </p>
        <Button type="button" onClick={() => setEditing({ gatekeeper: null })}>
          <Plus /> Register a gatekeeper
        </Button>
      </div>

      <LoadState
        isLoading={gatekeepers.isLoading}
        error={gatekeepers.error}
        hasData={!!gatekeepers.data}
        onRetry={() => void gatekeepers.reload()}
        what="the gatekeepers"
      >
        {gatekeepers.data?.length === 0 && (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No gatekeeper is registered yet. Register one to get its token, then put the token in
            the PC’s settings.
          </p>
        )}
        <ul className="space-y-4">
          {gatekeepers.data?.map((gatekeeper) => (
            <GatekeeperCard
              key={gatekeeper.id}
              gatekeeper={gatekeeper}
              now={now}
              onEdit={() => setEditing({ gatekeeper })}
              onRotate={() => {
                setRotateError(null);
                setRotating(gatekeeper);
              }}
            />
          ))}
        </ul>
      </LoadState>

      <AlertDialog open={rotating !== null} onOpenChange={(open) => !open && setRotating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate the token for {rotating?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The current token stops working immediately. The PC keeps serving from its local copy
              in the meantime, but it cannot sync until you put the new token in its settings. You
              will see the new token once.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ErrorNote message={rotateError} />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the current token</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void rotate();
              }}
            >
              Rotate token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing && (
        <GatekeeperDialog
          gatekeeper={editing.gatekeeper}
          onClose={() => setEditing(null)}
          onSaved={async (token) => {
            const name = editing.gatekeeper?.name;
            setEditing(null);
            if (token) setSecret({ title: 'Gatekeeper registered', token });
            else toast.success(`${name ?? 'Gatekeeper'} saved.`);
            await gatekeepers.reload();
          }}
        />
      )}

      {secret && (
        <SecretDialog
          title={secret.title}
          secretLabel="Gatekeeper token"
          secret={secret.token}
          description={TOKEN_HELP}
          onDone={() => setSecret(null)}
        />
      )}
    </div>
  );
}

function GatekeeperCard({
  gatekeeper,
  now,
  onEdit,
  onRotate,
}: {
  gatekeeper: Gatekeeper;
  now: number;
  onEdit: () => void;
  onRotate: () => void;
}) {
  const health = healthOf(gatekeeper.health);
  const status = gatekeeperStatus(gatekeeper, now);
  return (
    <li className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {gatekeeper.name}
            <StatusBadge status={status} />
          </h2>
          <p className="text-sm text-muted-foreground">
            Last heard from {formatAgo(gatekeeper.lastSeenAt, now)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={`Rotate token for ${gatekeeper.name}`}
            onClick={onRotate}
          >
            Rotate token
          </Button>
        </div>
      </div>

      <section
        aria-label={`Last health report of ${gatekeeper.name}`}
        className="space-y-1 text-sm"
      >
        <h3 className="font-medium">Last health report</h3>
        {!health || !gatekeeper.healthReportedAt ? (
          <p className="text-muted-foreground">No health report yet.</p>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <Fact label="Received" value={formatAgo(gatekeeper.healthReportedAt, now)} />
            <Fact
              label="Last sync"
              value={health.lastSyncAt ? formatAgo(health.lastSyncAt, now) : 'never'}
            />
            {health.version && <Fact label="Version" value={health.version} />}
            {health.uptimeSeconds !== undefined && (
              <Fact label="Running for" value={formatUptime(health.uptimeSeconds)} />
            )}
            {health.journalPending !== undefined && (
              <Fact
                label="Waiting to upload"
                value={`${health.journalPending} event${health.journalPending === 1 ? '' : 's'}`}
              />
            )}
            {health.streamConnected !== undefined && (
              <Fact
                label="Live connection"
                value={health.streamConnected ? 'Connected' : 'Not connected (checking by polling)'}
              />
            )}
          </dl>
        )}
        {health?.errors && health.errors.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-destructive">
            {health.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Checks for changes every {gatekeeper.pollIntervalSeconds} s · resets nightly at{' '}
        {gatekeeper.nightlyResetTime} ·{' '}
        {gatekeeper.maxOfflineTrustHours
          ? `stops trusting its copy after ${gatekeeper.maxOfflineTrustHours} h offline`
          : 'trusts its copy while offline'}{' '}
        · token changed {formatWhen(gatekeeper.tokenRotatedAt)}
      </p>
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd>{value}</dd>
    </div>
  );
}

function GatekeeperDialog({
  gatekeeper,
  onClose,
  onSaved,
}: {
  gatekeeper: Gatekeeper | null;
  onClose: () => void;
  /** The token is passed only when a gatekeeper was just registered. */
  onSaved: (token: string | null) => Promise<void>;
}) {
  const [form, setForm] = useState<GatekeeperForm>(() => gatekeeperFormFrom(gatekeeper));
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<ReturnType<typeof issuesFromError>>([]);
  const [failure, setFailure] = useState<string | null>(null);

  const set = <K extends GatekeeperField>(field: K, value: GatekeeperForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));
  const local = showErrors ? validateGatekeeperForm(form) : {};
  const errorsFor = (field: GatekeeperField) =>
    [local[field], ...issuesFor(problems, field).map((p) => p.message)].filter(
      (m): m is string => !!m,
    );

  const save = async () => {
    if (Object.keys(validateGatekeeperForm(form)).length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setFailure(null);
    setProblems([]);
    try {
      const body = gatekeeperBodyFrom(form, gatekeeper);
      if (gatekeeper) {
        await accessAdminAPI.updateGatekeeper(gatekeeper.id, body);
        await onSaved(null);
      } else {
        const result = await accessAdminAPI.registerGatekeeper(body);
        await onSaved(result.token);
      }
    } catch (error) {
      setProblems(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't save that gatekeeper."));
    } finally {
      setSaving(false);
    }
  };

  const { requestClose, guard } = useGuardedClose(form, onClose);

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {gatekeeper ? `Edit ${gatekeeper.name}` : 'Register a gatekeeper'}
          </DialogTitle>
          <DialogDescription>
            {gatekeeper
              ? 'Changes reach the PC within a few seconds.'
              : 'You will get its token once, right after you save.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TextField
            label="Name"
            value={form.name}
            onValueChange={(value) => set('name', value)}
            error={errorsFor('name')}
            placeholder="Makerspace PC"
          />
          <TextField
            label="Check for changes every (seconds)"
            inputMode="numeric"
            value={form.pollIntervalSeconds}
            onValueChange={(value) => set('pollIntervalSeconds', value)}
            hint={`Default: ${GATEKEEPER_DEFAULTS.pollIntervalSeconds}`}
            help="Used when the live connection is down. 5 to 3600."
            error={errorsFor('pollIntervalSeconds')}
          />
          <TextField
            label="Stop trusting its copy after (hours offline)"
            inputMode="numeric"
            value={form.maxOfflineTrustHours}
            onValueChange={(value) => set('maxOfflineTrustHours', value)}
            hint="Default: no limit"
            help="Empty means the PC keeps answering from its last copy however long the internet is down. If you set a limit, it refuses everyone (data too old) once that many hours pass without a sync."
            error={errorsFor('maxOfflineTrustHours')}
          />
          <TextField
            label="Nightly reset at"
            type="time"
            value={form.nightlyResetTime}
            onValueChange={(value) => set('nightlyResetTime', value)}
            hint={`Default: ${GATEKEEPER_DEFAULTS.nightlyResetTime}`}
            help="Closes visits people forgot to end. It never switches off a machine that is still drawing working power."
            error={errorsFor('nightlyResetTime')}
          />
          <TextField
            label="Ignore a second tap within (seconds)"
            inputMode="numeric"
            value={form.tapDebounceSeconds}
            onValueChange={(value) => set('tapDebounceSeconds', value)}
            hint={`Default: ${GATEKEEPER_DEFAULTS.tapDebounceSeconds}`}
            help="So a double tap does not undo itself. 0 to 60."
            error={errorsFor('tapDebounceSeconds')}
          />
          {gatekeeper && (
            <CheckField
              label="Active"
              checked={form.active}
              onCheckedChange={(value) => set('active', value)}
              help="A deactivated gatekeeper is refused by the dashboard; its PC keeps serving from its local copy."
            />
          )}
          <ServerProblems
            issues={problems}
            failure={failure}
            claimedFields={[
              'name',
              'pollIntervalSeconds',
              'maxOfflineTrustHours',
              'nightlyResetTime',
              'tapDebounceSeconds',
            ]}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving...' : gatekeeper ? 'Save gatekeeper' : 'Register gatekeeper'}
          </Button>
        </DialogFooter>
        {guard}
      </DialogContent>
    </Dialog>
  );
}
