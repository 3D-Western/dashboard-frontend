'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { pipelineReviewApi } from '@/api/client/pipeline-review';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DECISION_HELP,
  DECISION_LABEL,
  REASON_MAX,
  buildDecisionRequest,
  decisionsFor,
  needsConfirmation,
  sortDecisions,
  staffStatusLabel,
  validateDecision,
  type DecisionErrors,
} from '@/lib/pipeline-review';
import { useUser } from '@/providers/user-provider';
import type { Finding, StaffDecisionResult, StaffDecisionType } from '@/types/pipeline-review';
import { reviewErrorMessage } from './ReviewBits';

interface DecisionPanelProps {
  jobId: string;
  /** What the backend says is possible from the job's status. */
  allowedDecisions: StaffDecisionType[];
  /** The holds a `release` can cover. */
  releasable: Finding[];
  /** Told after the pipeline took (or queued) a decision, so the page can reload. */
  onDecided?: (result: StaffDecisionResult) => void;
}

/**
 * The staff decisions on one job. A reason is always required; `release` also needs the finding
 * codes; reject, escalate, cancel and resolve-escalation are confirmed in a second step.
 * `resolve_escalation` only appears for staff with `jobs:resolve_escalation`.
 */
export function DecisionPanel({
  jobId,
  allowedDecisions,
  releasable,
  onDecided,
}: DecisionPanelProps) {
  const user = useUser();
  const offered = sortDecisions(decisionsFor(allowedDecisions, user));

  const [decision, setDecision] = useState<StaffDecisionType | null>(null);
  const [reason, setReason] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [errors, setErrors] = useState<DecisionErrors>({});
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<StaffDecisionResult | null>(null);
  // One key per decision being made: sending it again after a network error never applies it twice.
  const keyRef = useRef<string>('');

  function choose(next: StaffDecisionType) {
    setDecision(next);
    setErrors({});
    setFailure(null);
    setResult(null);
    keyRef.current = crypto.randomUUID();
  }

  function cancel() {
    setDecision(null);
    setReason('');
    setCodes([]);
    setErrors({});
    setFailure(null);
  }

  function toggleCode(code: string, on: boolean) {
    setCodes((current) => (on ? [...current, code] : current.filter((c) => c !== code)));
  }

  function submit() {
    if (!decision) return;
    const found = validateDecision({ decision, reason, codes });
    setErrors(found);
    if (found.reason || found.codes) return;
    if (needsConfirmation(decision)) setConfirming(true);
    else void send();
  }

  async function send() {
    if (!decision) return;
    setSending(true);
    setFailure(null);
    try {
      const answer = await pipelineReviewApi.decide(
        jobId,
        buildDecisionRequest({ decision, reason, codes }),
        keyRef.current,
      );
      setResult(answer);
      setConfirming(false);
      cancel();
      onDecided?.(answer);
    } catch (error) {
      setConfirming(false);
      setFailure(
        reviewErrorMessage(error, 'The decision was not sent. Check the job and try again.'),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-label="Decide" className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="text-lg font-semibold">Decide</h2>

      {result && <DecisionResult result={result} />}

      {offered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing to decide in this status. The pipeline moves the job on by itself.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Decisions">
          {offered.map((option) => (
            <Button
              key={option}
              type="button"
              variant={decision === option ? 'default' : 'outline'}
              className="h-11 fine:h-9"
              aria-pressed={decision === option}
              onClick={() => choose(option)}
            >
              {DECISION_LABEL[option]}
            </Button>
          ))}
        </div>
      )}

      {decision && (
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <p className="text-sm text-muted-foreground">{DECISION_HELP[decision]}</p>

          {decision === 'release' && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Findings to release</legend>
              {releasable.length === 0 && (
                <p className="text-sm text-muted-foreground">This job has no findings to name.</p>
              )}
              {releasable.map((finding) => {
                const id = `release-${finding.code}`;
                return (
                  <div key={finding.code} className="flex min-h-11 items-start gap-3 fine:min-h-0">
                    <Checkbox
                      id={id}
                      checked={codes.includes(finding.code)}
                      onCheckedChange={(checked) => toggleCode(finding.code, checked === true)}
                    />
                    <Label htmlFor={id} className="flex-1 flex-col items-start gap-0.5">
                      <span className="font-mono text-sm">{finding.code}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {finding.message}
                      </span>
                    </Label>
                  </div>
                );
              })}
              {errors.codes && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.codes}
                </p>
              )}
            </fieldset>
          )}

          <div className="space-y-2">
            <Label htmlFor="decision-reason">Reason (required)</Label>
            <Textarea
              id="decision-reason"
              value={reason}
              maxLength={REASON_MAX}
              placeholder="Why? This is kept with the decision and given to the pipeline."
              aria-invalid={errors.reason ? true : undefined}
              aria-describedby={errors.reason ? 'decision-reason-error' : undefined}
              onChange={(event) => setReason(event.target.value)}
            />
            {errors.reason && (
              <p id="decision-reason-error" role="alert" className="text-sm text-destructive">
                {errors.reason}
              </p>
            )}
          </div>

          {failure && (
            <Alert variant="destructive">
              <AlertTitle>Not sent</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-11 fine:h-9" disabled={sending}>
              {sending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {needsConfirmation(decision) ? 'Review and send…' : 'Send decision'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 fine:h-9"
              onClick={cancel}
              disabled={sending}
            >
              Never mind
            </Button>
          </div>
        </form>
      )}

      <AlertDialog open={confirming} onOpenChange={(open) => !sending && setConfirming(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision ? `${DECISION_LABEL[decision]}?` : 'Confirm'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision ? DECISION_HELP[decision] : ''} Your reason: “{reason.trim()}”
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              {decision ? `Yes, ${DECISION_LABEL[decision].toLowerCase()}` : 'Yes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** What happened to the decision: taken by the pipeline, or waiting for it to come back. */
export function DecisionResult({ result }: { result: StaffDecisionResult }) {
  const queued = result.delivery === 'QUEUED';
  const failed = result.delivery === 'FAILED' || result.delivery === 'REFUSED';
  return (
    <Alert variant={failed ? 'destructive' : 'default'} role="status">
      <AlertTitle>
        {failed
          ? 'The pipeline did not take it'
          : queued
            ? 'Queued for the pipeline'
            : 'Sent to the pipeline'}
      </AlertTitle>
      <AlertDescription>
        {DECISION_LABEL[result.decision]}:{' '}
        {queued
          ? 'it will be delivered when the pipeline is reachable.'
          : failed
            ? 'decide again once the problem is fixed.'
            : 'the pipeline took it.'}
        {result.staffStatus && <> Status is now {staffStatusLabel(result.staffStatus)}.</>}
      </AlertDescription>
    </Alert>
  );
}
