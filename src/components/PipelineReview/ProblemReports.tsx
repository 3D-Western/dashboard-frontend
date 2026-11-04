'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { pipelineReviewApi } from '@/api/client/pipeline-review';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REASON_MAX, REASON_MIN, shortId } from '@/lib/pipeline-review';
import { formatAgo, formatDateTime } from '@/lib/signoff-format';
import { Routes } from '@/lib/routes';
import type { ProblemReport } from '@/types/pipeline-review';
import { reviewErrorMessage } from './ReviewBits';

/** The note a resolution needs: 3 to 1000 characters (the backend's ResolveReportRequest). */
export function validateNote(note: string): string | null {
  const text = note.trim();
  if (text.length === 0) return 'A note is required.';
  if (text.length < REASON_MIN) return `The note must be at least ${REASON_MIN} characters.`;
  if (text.length > REASON_MAX) return `The note can be at most ${REASON_MAX} characters.`;
  return null;
}

/** One student report, with "Resolve" (a note is required) while it is open. */
export function ProblemReportCard({
  report,
  now = new Date(),
  showJobLink = true,
  onResolved,
}: {
  report: ProblemReport;
  now?: Date;
  /** false on a job's own page, where the link would point back here. */
  showJobLink?: boolean;
  onResolved?: (report: ProblemReport) => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const open = report.status === 'OPEN';
  const noteId = `report-note-${report.id}`;

  async function resolve() {
    const problem = validateNote(note);
    setError(problem);
    if (problem || report.id == null) return;
    setSending(true);
    setFailure(null);
    try {
      const done = await pipelineReviewApi.resolveReport(report.id, { note: note.trim() });
      setResolving(false);
      setNote('');
      onResolved?.(done);
    } catch (err) {
      setFailure(reviewErrorMessage(err, 'The report was not resolved. Try again.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="space-y-2 rounded-xl border bg-card p-4" data-report-id={report.id}>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant={open ? 'secondary' : 'outline'}>{open ? 'Open' : 'Resolved'}</Badge>
        <span>Student {report.studentId}</span>
        <span title={formatDateTime(report.createdAt)}>· {formatAgo(report.createdAt, now)}</span>
        {report.page && <span>· on {report.page}</span>}
        {showJobLink && report.jobId && (
          <Link
            href={Routes.adminReviewJob(report.jobId)}
            className="text-primary underline-offset-4 hover:underline"
          >
            Job {shortId(report.jobId)}
          </Link>
        )}
      </div>
      <p className="text-sm whitespace-pre-wrap">{report.text}</p>

      {!open && report.resolutionNote && (
        <p className="text-sm text-muted-foreground">
          Resolved{report.resolvedAt ? ` ${formatAgo(report.resolvedAt, now)}` : ''}:{' '}
          {report.resolutionNote}
        </p>
      )}

      {open && !resolving && (
        <Button
          type="button"
          variant="outline"
          className="h-11 fine:h-9"
          onClick={() => setResolving(true)}
        >
          Resolve
        </Button>
      )}

      {open && resolving && (
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
            aria-invalid={error ? true : undefined}
            placeholder="What was done about it?"
            onChange={(event) => setNote(event.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {failure && (
            <Alert variant="destructive">
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="h-11 fine:h-9" disabled={sending}>
              {sending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Mark resolved
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 fine:h-9"
              disabled={sending}
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

/** A list of reports; resolving one tells the parent so it can reload counts. */
export function ProblemReportList({
  reports,
  onResolved,
  showJobLink,
  now,
}: {
  reports: ProblemReport[];
  onResolved?: (report: ProblemReport) => void;
  showJobLink?: boolean;
  now?: Date;
}) {
  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">No problem reports.</p>;
  }
  return (
    <ul className="space-y-3">
      {reports.map((report) => (
        <li key={report.id ?? report.createdAt}>
          <ProblemReportCard
            report={report}
            onResolved={onResolved}
            showJobLink={showJobLink}
            now={now}
          />
        </li>
      ))}
    </ul>
  );
}
