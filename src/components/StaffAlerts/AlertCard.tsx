'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2 } from 'lucide-react';
import { staffAlertsApi } from '@/api/client/staff-alerts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { reviewErrorMessage } from '@/components/PipelineReview/ReviewBits';
import { validateNote } from '@/components/PipelineReview/ProblemReports';
import { REASON_MAX } from '@/lib/pipeline-review';
import { formatAgo, formatDateTime } from '@/lib/signoff-format';
import { KIND_LABEL, SEVERITY_LABEL, STATE_LABEL, alertLink, handledBy } from '@/lib/staff-alerts';
import { cn } from '@/lib/utils';
import type { AlertSeverity, StaffAlert } from '@/types/staff-alerts';

const SEVERITY_CLASS: Record<AlertSeverity, string> = {
  critical: 'bg-status-red text-status-red-foreground',
  warning: 'bg-status-yellow text-status-yellow-foreground',
  info: 'bg-status-gray text-status-gray-foreground',
};

const BORDER_CLASS: Record<AlertSeverity, string> = {
  critical: 'border-l-status-red',
  warning: 'border-l-status-yellow',
  info: 'border-l-status-gray',
};

/**
 * One alert: what happened, where to deal with it, and acknowledge / resolve in place. Resolving
 * needs a note (3 to 1000 characters, like the backend). The parent gets the updated alert back.
 */
export function AlertCard({
  alert,
  now = new Date(),
  onChanged,
}: {
  alert: StaffAlert;
  now?: Date;
  onChanged?: (alert: StaffAlert) => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState<'acknowledge' | 'resolve' | null>(null);

  const link = alertLink(alert.target);
  const resolved = alert.state === 'resolved';
  const noteId = `alert-note-${alert.id}`;
  const by = handledBy(alert);

  async function acknowledge() {
    setBusy('acknowledge');
    setFailure(null);
    try {
      onChanged?.(await staffAlertsApi.acknowledge(alert.id));
    } catch (err) {
      setFailure(reviewErrorMessage(err, 'The alert was not acknowledged. Try again.'));
    } finally {
      setBusy(null);
    }
  }

  async function resolve() {
    const problem = validateNote(note);
    setNoteError(problem);
    if (problem) return;
    setBusy('resolve');
    setFailure(null);
    try {
      const done = await staffAlertsApi.resolve(alert.id, { note: note.trim() });
      setResolving(false);
      setNote('');
      onChanged?.(done);
    } catch (err) {
      setFailure(reviewErrorMessage(err, 'The alert was not resolved. Try again.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <article
      className={cn(
        'space-y-3 rounded-xl border border-l-4 bg-card p-4',
        BORDER_CLASS[alert.severity],
        resolved && 'opacity-80',
      )}
      data-alert-id={alert.id}
      data-state={alert.state}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn('border-transparent', SEVERITY_CLASS[alert.severity])}
        >
          {SEVERITY_LABEL[alert.severity]}
        </Badge>
        <Badge variant="secondary">{KIND_LABEL[alert.kind]}</Badge>
        <Badge variant={alert.state === 'open' ? 'default' : 'outline'}>
          {STATE_LABEL[alert.state]}
        </Badge>
        {alert.occurrences > 1 && <Badge variant="outline">Raised {alert.occurrences} times</Badge>}
        <span className="text-sm text-muted-foreground" title={formatDateTime(alert.createdAt)}>
          {formatAgo(alert.createdAt, now)}
        </span>
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold">{alert.title}</h3>
        <p className="text-sm">{alert.summary}</p>
      </div>

      {alert.details.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {alert.details.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-muted-foreground">{detail.label}</dt>
              <dd className="min-w-0 font-mono text-xs break-words">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(by || alert.resolutionNote) && (
        <p className="text-sm text-muted-foreground">
          {by}
          {resolved && alert.resolvedAt ? ` ${formatAgo(alert.resolvedAt, now)}` : ''}
          {!resolved && alert.acknowledgedAt ? ` ${formatAgo(alert.acknowledgedAt, now)}` : ''}
          {alert.resolutionNote ? `: ${alert.resolutionNote}` : ''}
        </p>
      )}

      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}

      {!resolving && (
        <div className="flex flex-wrap gap-2">
          {link && (
            <Button asChild className="h-11 fine:h-9">
              <Link href={link.href}>
                <ExternalLink aria-hidden="true" />
                {link.label}
              </Link>
            </Button>
          )}
          {alert.state === 'open' && (
            <Button
              type="button"
              variant="outline"
              className="h-11 fine:h-9"
              disabled={busy !== null}
              onClick={() => void acknowledge()}
            >
              {busy === 'acknowledge' && <Loader2 className="animate-spin" aria-hidden="true" />}
              Acknowledge
            </Button>
          )}
          {!resolved && (
            <Button
              type="button"
              variant="outline"
              className="h-11 fine:h-9"
              disabled={busy !== null}
              onClick={() => setResolving(true)}
            >
              Resolve
            </Button>
          )}
        </div>
      )}

      {!resolved && resolving && (
        <form
          className="space-y-2"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void resolve();
          }}
        >
          <Label htmlFor={noteId}>Resolution note (required)</Label>
          <Textarea
            id={noteId}
            value={note}
            maxLength={REASON_MAX}
            aria-invalid={noteError ? true : undefined}
            placeholder="What was done about it?"
            onChange={(event) => setNote(event.target.value)}
          />
          {noteError && (
            <p role="alert" className="text-sm text-destructive">
              {noteError}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="h-11 fine:h-9" disabled={busy !== null}>
              {busy === 'resolve' && <Loader2 className="animate-spin" aria-hidden="true" />}
              Mark resolved
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 fine:h-9"
              disabled={busy !== null}
              onClick={() => setResolving(false)}
            >
              Never mind
            </Button>
          </div>
        </form>
      )}
    </article>
  );
}
