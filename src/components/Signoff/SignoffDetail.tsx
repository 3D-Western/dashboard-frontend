'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { signoffAPI } from '@/api/client/signoff';
import { isAlreadyDecided, signoffErrorMessage } from '@/api/client/signoff-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatAgo, formatDateTime, personName, staffName } from '@/lib/signoff-format';
import { Routes } from '@/lib/routes';
import type { Signoff } from '@/types/signoff';

const CHANNEL_LABELS = { DASHBOARD: 'the dashboard', TEAMS: 'Teams', MANUAL: 'a manual entry' };

/**
 * One student's in-person sign-off. The supervisor stands next to the student and ticks each item as
 * they see it done; Approve stays disabled until every item is ticked. Rejecting needs a reason and
 * means "not ready in person yet": the student stays in line for another check, unless the supervisor
 * also ticks that they must redo the online training. Built phone-first: big tap targets, full-width buttons.
 */
export function SignoffDetail({ signoffId, now = new Date() }: { signoffId: number; now?: Date }) {
  const [signoff, setSignoff] = useState<Signoff | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [mustRedo, setMustRedo] = useState(false);
  const [justDecided, setJustDecided] = useState(false);
  // What a rejection just did to the student, for the message after it
  const [followUp, setFollowUp] = useState<'again' | 'redo' | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setSignoff(await signoffAPI.get(signoffId));
    } catch (err) {
      setLoadError(signoffErrorMessage(err, "We couldn't load this sign-off."));
    }
  }, [signoffId]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);

  if (!signoff) {
    return loadError ? (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={() => void load()}>
          Try again
        </Button>
        <BackLink />
      </div>
    ) : (
      <div className="space-y-4" role="status" aria-label="Loading sign-off">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const pending = signoff.status === 'PENDING';
  const allChecked = signoff.checklist.every((item) => checked.has(item.key));
  const canDecide = pending && !signoff.ownRequest && !busy;

  const toggle = (key: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const decide = async (action: () => Promise<Signoff>, after: 'again' | 'redo' | null = null) => {
    setBusy(true);
    setActionError(null);
    try {
      setSignoff(await action());
      setRejectOpen(false);
      setJustDecided(true);
      setFollowUp(after);
    } catch (err) {
      setActionError(signoffErrorMessage(err));
      setRejectOpen(false);
      // Someone else (or Teams) got there first: show how it ended
      if (isAlreadyDecided(err)) await load();
    } finally {
      setBusy(false);
    }
  };

  const approve = () =>
    decide(() =>
      signoffAPI.approve(
        signoff.id,
        signoff.checklist.map((item) => item.key),
      ),
    );

  const reject = () =>
    decide(
      () =>
        signoffAPI.reject(
          signoff.id,
          reason.trim(),
          signoff.checklist.filter((item) => checked.has(item.key)).map((item) => item.key),
          mustRedo,
        ),
      mustRedo ? 'redo' : 'again',
    );

  return (
    <div className="space-y-6">
      <BackLink />

      <section className="space-y-1 rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="text-xl">{personName(signoff.student)}</h2>
        <p className="text-sm text-muted-foreground">
          Student number {signoff.student.studentId} · {signoff.student.email}
        </p>
        <p className="pt-2 text-base">
          {signoff.training.title}{' '}
          <span className="text-sm text-muted-foreground">
            (version {signoff.training.versionNo})
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          Passed online {formatAgo(signoff.onlinePassedAt, now)}
        </p>
      </section>

      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {pending ? (
        <>
          {signoff.ownRequest && (
            <Alert>
              <AlertDescription>
                This is your own training. Another supervisor has to sign you off.
              </AlertDescription>
            </Alert>
          )}

          <fieldset className="space-y-3" disabled={!canDecide}>
            <legend className="mb-1 text-base font-medium">
              Check each item with the student in front of you
            </legend>
            {signoff.checklist.length === 0 && (
              <p className="text-sm text-muted-foreground">This training has no checklist items.</p>
            )}
            {signoff.checklist.map((item) => (
              <ChecklistRow
                key={item.key}
                label={item.label}
                checked={checked.has(item.key)}
                onToggle={() => toggle(item.key)}
              />
            ))}
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {checked.size} of {signoff.checklist.length} checked
            </p>
          </fieldset>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="h-12 w-full text-base sm:w-auto sm:min-w-40"
              disabled={!canDecide || !allChecked}
              onClick={() => void approve()}
            >
              {busy ? 'Saving...' : 'Approve sign-off'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full text-base sm:w-auto"
              disabled={!canDecide}
              onClick={() => {
                setActionError(null);
                setRejectOpen(true);
              }}
            >
              Not ready: reject
            </Button>
          </div>
        </>
      ) : (
        <DecisionSummary signoff={signoff} justDecided={justDecided} followUp={followUp} />
      )}

      <RejectDialog
        mustRedo={mustRedo}
        onMustRedoChange={setMustRedo}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        studentName={personName(signoff.student)}
        reason={reason}
        onReasonChange={setReason}
        busy={busy}
        onConfirm={() => void reject()}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href={Routes.adminSignoffs}
      className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      All sign-offs
    </Link>
  );
}

/** A whole row is the tap target (at least 56px tall), not just the box. */
function ChecklistRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border bg-card px-4 py-3 has-[:checked]:border-status-green has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="size-6 shrink-0 accent-purple-light"
      />
      <span className="text-base">{label}</span>
    </label>
  );
}

function DecisionSummary({
  signoff,
  justDecided,
  followUp,
}: {
  signoff: Signoff;
  justDecided: boolean;
  followUp: 'again' | 'redo' | null;
}) {
  const approved = signoff.status === 'APPROVED';
  const decided = signoff.status === 'APPROVED' || signoff.status === 'REJECTED';
  const heading = approved
    ? 'Signed off'
    : signoff.status === 'REJECTED'
      ? 'Not approved'
      : 'This request was cancelled';

  return (
    <section className="space-y-4" aria-label="Decision">
      <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
        {approved ? (
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-status-green" aria-hidden />
        ) : (
          <XCircle className="mt-0.5 size-6 shrink-0 text-status-red" aria-hidden />
        )}
        <div className="space-y-1">
          <h3 className="text-lg">{heading}</h3>
          {decided && signoff.decidedBy && signoff.decidedAt && (
            <p className="text-sm text-muted-foreground">
              By {staffName(signoff.decidedBy)} on {formatDateTime(signoff.decidedAt)}
              {signoff.channel ? ` using ${CHANNEL_LABELS[signoff.channel]}` : ''}
            </p>
          )}
          {signoff.status === 'REJECTED' && (
            <p className="text-sm">Reason: {signoff.notes ?? 'not recorded'}</p>
          )}
          {followUp === 'again' && (
            <p className="text-sm">
              {personName(signoff.student)} stays in the queue and can come back for another
              in-person check.
            </p>
          )}
          {followUp === 'redo' && (
            <p className="text-sm">
              {personName(signoff.student)} must redo the online training before asking again.
            </p>
          )}
          {approved && signoff.notes && <p className="text-sm">Note: {signoff.notes}</p>}
          {justDecided && approved && (
            <p className="text-sm">{personName(signoff.student)} is now certified.</p>
          )}
        </div>
      </div>

      {signoff.checklistResult && signoff.checklistResult.length > 0 && (
        <ul className="space-y-2">
          {signoff.checklistResult.map((item) => (
            <li key={item.key} className="flex items-center gap-3 rounded-lg border px-4 py-3">
              {item.checked ? (
                <CheckCircle2 className="size-5 shrink-0 text-status-green" aria-hidden />
              ) : (
                <XCircle className="size-5 shrink-0 text-status-red" aria-hidden />
              )}
              <span>
                {item.label}
                <span className="sr-only">{item.checked ? ' (checked)' : ' (not checked)'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Button asChild variant="outline" className="h-12 w-full sm:w-auto">
        <Link href={Routes.adminSignoffs}>Back to the list</Link>
      </Button>
    </section>
  );
}

function RejectDialog({
  mustRedo,
  onMustRedoChange,
  open,
  onOpenChange,
  studentName,
  reason,
  onReasonChange,
  busy,
  onConfirm,
}: {
  mustRedo: boolean;
  onMustRedoChange: (value: boolean) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  reason: string;
  onReasonChange: (reason: string) => void;
  busy: boolean;
  onConfirm: () => void;
}) {
  const id = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject this sign-off?</DialogTitle>
          <DialogDescription>
            {studentName} is not ready yet. They stay in the queue for another in-person check. Say
            what they need to work on; they will see it on their training page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor={id} className="text-sm font-medium">
            Reason
          </label>
          <Textarea
            id={id}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="For example: could not find the emergency stop"
          />
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2">
          <input
            type="checkbox"
            checked={mustRedo}
            onChange={(event) => onMustRedoChange(event.target.checked)}
            disabled={busy}
            className="size-5 shrink-0 accent-purple-light"
          />
          <span className="text-sm">They must redo the online training first</span>
        </label>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 fine:h-9"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-12 fine:h-9"
            onClick={onConfirm}
            disabled={busy || reason.trim().length === 0}
          >
            {busy ? 'Saving...' : 'Reject sign-off'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
