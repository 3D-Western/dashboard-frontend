'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Printer, RefreshCw } from 'lucide-react';
import { pipelineFarmApi } from '@/api/client/pipeline-farm';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  HELD_CHOICE_HELP,
  HELD_CHOICE_LABEL,
  buildClearRequest,
  buildResolveRequest,
  heldOldestFirst,
  printerLabel,
  quarantinedOldestFirst,
  validateReason,
  type HeldChoice,
} from '@/lib/pipeline-farm';
import { REASON_MAX, shortId } from '@/lib/pipeline-review';
import { Routes } from '@/lib/routes';
import { formatAgo } from '@/lib/signoff-format';
import type { FarmOverview, HeldFarmJob, PrinterQuarantine } from '@/types/pipeline-farm';
import { reviewErrorMessage } from './ReviewBits';

export const FARM_REFRESH_MS = 15_000;

/** What the person is about to do, waiting for a reason and a yes. */
type Pending =
  | { kind: 'held'; job: HeldFarmJob; choice: HeldChoice }
  | { kind: 'printer'; printer: PrinterQuarantine };

/**
 * The reason box every farm action needs: required, 3 to 1000 characters, checked before
 * anything is sent. `onSubmit` is only called with a valid reason.
 */
function ReasonForm({
  id,
  label,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  busy,
}: {
  id: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const problem = validateReason(reason);
        setError(problem);
        if (!problem) onSubmit(reason);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Textarea
          id={id}
          value={reason}
          maxLength={REASON_MAX}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => setReason(event.target.value)}
        />
        {error && (
          <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11 fine:h-9" disabled={busy}>
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 fine:h-9"
          disabled={busy}
          onClick={onCancel}
        >
          Never mind
        </Button>
      </div>
    </form>
  );
}

function HeldJobCard({
  job,
  now,
  active,
  busy,
  onChoose,
  onSubmit,
  onCancel,
}: {
  job: HeldFarmJob;
  now: Date;
  active: HeldChoice | null;
  busy: boolean;
  onChoose: (choice: HeldChoice) => void;
  onSubmit: (choice: HeldChoice, reason: string) => void;
  onCancel: () => void;
}) {
  return (
    <li className="space-y-3 rounded-xl border bg-card p-4" data-testid="held-job">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={Routes.adminReviewJob(job.jobId)}
            className="text-base font-medium underline-offset-4 hover:underline"
          >
            {job.jobName ?? 'Untitled job'}
          </Link>
          <Badge variant="secondary">Attempt {job.attempt}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {job.studentName ?? 'Unnamed student'}
          {job.studentId != null ? ` (${job.studentId})` : ''} · job {shortId(job.jobId)} · held{' '}
          {formatAgo(job.heldSince, now)}
          {job.printerId ? ` · printer ${job.printerId}` : ''}
          {job.binNumber != null ? ` · bin ${job.binNumber}` : ''}
          {job.pickupTag ? ` · tag ${job.pickupTag}` : ''}
        </p>
        <p className="text-sm">{job.reason}</p>
      </div>

      {active ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{HELD_CHOICE_HELP[active]}</p>
          <ReasonForm
            id={`held-reason-${job.jobId}`}
            label="Reason (required)"
            placeholder="What did you find, and why this choice? It is kept with the job."
            submitLabel={active === 'close' ? 'Review and close…' : 'Print again'}
            busy={busy}
            onSubmit={(reason) => onSubmit(active, reason)}
            onCancel={onCancel}
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label={`Resolve ${job.jobName}`}>
          {(['retry', 'close'] as const).map((choice) => (
            <Button
              key={choice}
              type="button"
              variant="outline"
              className="h-11 fine:h-9"
              onClick={() => onChoose(choice)}
            >
              {HELD_CHOICE_LABEL[choice]}
            </Button>
          ))}
        </div>
      )}
    </li>
  );
}

function QuarantineCard({
  printer,
  now,
  active,
  busy,
  onChoose,
  onSubmit,
  onCancel,
}: {
  printer: PrinterQuarantine;
  now: Date;
  active: boolean;
  busy: boolean;
  onChoose: () => void;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  return (
    <li className="space-y-3 rounded-xl border bg-card p-4" data-testid="quarantined-printer">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Printer className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-base font-medium">{printerLabel(printer)}</span>
          <Badge variant="destructive">Quarantined</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {printer.consecutiveFailures} {printer.consecutiveFailures === 1 ? 'failure' : 'failures'}{' '}
          in a row · since {formatAgo(printer.quarantinedAt, now)}
        </p>
        <p className="text-sm">{printer.reason}</p>
      </div>

      {active ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Check the printer first. Say what was wrong and what you did: it goes in the printer
            fault log.
          </p>
          <ReasonForm
            id={`quarantine-reason-${printer.printerId}`}
            label="What was wrong, and what did you do? (required)"
            placeholder="e.g. Nozzle partly clogged; cleaned it and ran a test print."
            submitLabel="Review and put back live…"
            busy={busy}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </div>
      ) : (
        <Button type="button" variant="outline" className="h-11 fine:h-9" onClick={onChoose}>
          Put back live
        </Button>
      )}
    </li>
  );
}

/**
 * Held farm jobs and quarantined printers, the two things the farm loop will not settle without
 * a person (P-81, P-109). Every action needs a reason, is confirmed in a second step, and tells
 * the backend, which tells the pipeline. Refreshes itself every 15 seconds. Staff only.
 */
export function FarmDesk({ now, refreshMs = FARM_REFRESH_MS }: { now?: Date; refreshMs?: number }) {
  const [overview, setOverview] = useState<FarmOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  // The action being prepared (reason being typed), and the one waiting for a final yes.
  const [choosing, setChoosing] = useState<
    | { kind: 'held'; jobId: string; choice: HeldChoice }
    | { kind: 'printer'; printerId: string }
    | null
  >(null);
  const [confirm, setConfirm] = useState<(Pending & { reason: string }) | null>(null);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setOverview(await pipelineFarmApi.overview());
      setError(null);
      setLoadedAt(new Date());
    } catch (err) {
      setError(reviewErrorMessage(err, "We couldn't load the print farm."));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const first = async () => {
      await load();
    };
    void first();
    if (refreshMs <= 0) return;
    const timer = setInterval(() => {
      // Never reload under someone typing a reason.
      if (typeof document !== 'undefined' && document.hidden) return;
      void load();
    }, refreshMs);
    return () => clearInterval(timer);
  }, [load, refreshMs]);

  async function send(action: Pending & { reason: string }) {
    setSending(true);
    setFailure(null);
    try {
      if (action.kind === 'held') {
        await pipelineFarmApi.resolveHeld(
          action.job.jobId,
          buildResolveRequest(action.choice, action.reason),
        );
        setDone(
          action.choice === 'retry'
            ? `${action.job.jobName ?? 'The job'} will print again.`
            : `${action.job.jobName ?? 'The job'} was closed and the student is told.`,
        );
      } else {
        await pipelineFarmApi.clearQuarantine(
          action.printer.printerId,
          buildClearRequest(action.reason),
        );
        setDone(`${printerLabel(action.printer)} is back live. The cause is logged.`);
      }
      setConfirm(null);
      setChoosing(null);
      await load();
    } catch (err) {
      setConfirm(null);
      setFailure(reviewErrorMessage(err, 'That was not sent. Check the farm and try again.'));
    } finally {
      setSending(false);
    }
  }

  const clock = now ?? new Date();
  const held = heldOldestFirst(overview?.heldJobs ?? []);
  const printers = quarantinedOldestFirst(overview?.quarantinedPrinters ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {overview
            ? `${held.length} held ${held.length === 1 ? 'job' : 'jobs'}, ${printers.length} quarantined ${printers.length === 1 ? 'printer' : 'printers'}.`
            : ''}
        </p>
        <div className="flex items-center gap-3">
          {loadedAt && (
            <span className="text-xs text-muted-foreground">
              Updated {formatAgo(loadedAt.toISOString(), clock)}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-11 fine:h-9"
            onClick={() => void load()}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {failure && (
        <Alert variant="destructive">
          <AlertTitle>Not sent</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      {done && (
        <Alert role="status">
          <AlertDescription>{done}</AlertDescription>
        </Alert>
      )}

      {!overview && !error && (
        <div className="space-y-3" role="status" aria-label="Loading the print farm">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      {overview && (
        <>
          <section aria-labelledby="held-heading" className="space-y-3">
            <h2 id="held-heading" className="text-lg font-semibold">
              Held jobs
            </h2>
            {held.length === 0 ? (
              <p className="text-sm text-muted-foreground">No job is waiting for a person.</p>
            ) : (
              <ul className="space-y-3">
                {held.map((job) => (
                  <HeldJobCard
                    key={job.jobId}
                    job={job}
                    now={clock}
                    active={
                      choosing?.kind === 'held' && choosing.jobId === job.jobId
                        ? choosing.choice
                        : null
                    }
                    busy={sending}
                    onChoose={(choice) => {
                      setDone(null);
                      setFailure(null);
                      setChoosing({ kind: 'held', jobId: job.jobId, choice });
                    }}
                    onCancel={() => setChoosing(null)}
                    onSubmit={(choice, reason) => {
                      const action = { kind: 'held', job, choice, reason } as const;
                      if (choice === 'close') setConfirm(action);
                      else void send(action);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="quarantine-heading" className="space-y-3">
            <h2 id="quarantine-heading" className="text-lg font-semibold">
              Quarantined printers
            </h2>
            {printers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every printer is in rotation.</p>
            ) : (
              <ul className="space-y-3">
                {printers.map((printer) => (
                  <QuarantineCard
                    key={printer.printerId}
                    printer={printer}
                    now={clock}
                    active={
                      choosing?.kind === 'printer' && choosing.printerId === printer.printerId
                    }
                    busy={sending}
                    onChoose={() => {
                      setDone(null);
                      setFailure(null);
                      setChoosing({ kind: 'printer', printerId: printer.printerId });
                    }}
                    onCancel={() => setChoosing(null)}
                    onSubmit={(reason) => setConfirm({ kind: 'printer', printer, reason })}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !sending && !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'printer'
                ? `Put ${printerLabel(confirm.printer)} back live?`
                : 'Close this job?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'printer'
                ? 'It will take jobs again. '
                : 'The student is told and the job will not print. '}
              Your reason: “{confirm?.reason.trim()}”
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(event) => {
                event.preventDefault();
                if (confirm) void send(confirm);
              }}
            >
              {sending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {confirm?.kind === 'printer' ? 'Yes, put it back live' : 'Yes, close it'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
