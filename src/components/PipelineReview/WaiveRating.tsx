'use client';

import { useState } from 'react';
import { Loader2, ThumbsUp } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { buildWaiveRequest } from '@/lib/pipeline-farm';
import { ReasonForm } from './ReasonForm';
import { reviewErrorMessage } from './ReviewBits';

/**
 * Rate first (P-20), staff side: a collected print the student has not rated blocks their next
 * 3D-print job. When the student cannot rate it (left the club, print lost), staff let it through
 * with a reason, which is audited against them. Reason first, then a second step to confirm.
 * The backend answers 409 when the print is not collected or already has a real rating.
 */
export function WaiveRating({ jobId, onWaived }: { jobId: string; onWaived?: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function send(text: string) {
    setSending(true);
    setFailure(null);
    try {
      const result = await pipelineFarmApi.waiveRating(jobId, buildWaiveRequest(text));
      setDone(result?.message || 'The rating is waived.');
      setOpen(false);
      onWaived?.();
    } catch (err) {
      setFailure(reviewErrorMessage(err, 'The rating was not waived. Try again.'));
    } finally {
      setReason(null);
      setSending(false);
    }
  }

  return (
    <section aria-labelledby={`waive-${jobId}`} className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <h2 id={`waive-${jobId}`} className="text-base font-semibold">
          Rating
        </h2>
        <p className="text-sm text-muted-foreground">
          The student rates a collected print with one tap before starting a new one. If they cannot
          rate this one, let it through with a reason.
        </p>
      </div>

      {done && (
        <p role="status" className="text-sm text-status-green-foreground">
          {done}
        </p>
      )}
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}

      {open ? (
        <ReasonForm
          id={`waive-reason-${jobId}`}
          label="Why is the rating waived?"
          placeholder="e.g. The print was lost, the student cannot rate it"
          submitLabel="Continue"
          busy={sending}
          onSubmit={setReason}
          onCancel={() => setOpen(false)}
        />
      ) : (
        !done && (
          <Button
            type="button"
            variant="outline"
            className="h-11 fine:h-9"
            onClick={() => {
              setFailure(null);
              setOpen(true);
            }}
          >
            <ThumbsUp aria-hidden="true" />
            Waive rating
          </Button>
        )
      )}

      <AlertDialog
        open={reason !== null}
        onOpenChange={(next) => !sending && !next && setReason(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Waive this rating?</AlertDialogTitle>
            <AlertDialogDescription>
              The student can start a new print without rating this one. Your reason is saved with
              your name. Your reason: “{reason?.trim()}”
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(event) => {
                event.preventDefault();
                if (reason !== null) void send(reason);
              }}
            >
              {sending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Yes, waive it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
