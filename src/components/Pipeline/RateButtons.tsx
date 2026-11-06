'use client';

import { useState } from 'react';
import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { isConflictError, pipelineApi } from '@/api/client/pipeline';
import { Button } from '@/components/ui/button';
import { rememberRated } from '@/lib/pipeline-aftercare';
import { cn } from '@/lib/utils';
import type { Rating } from '@/types/pipeline';

/**
 * The one-tap thumbs up / down (P-20). Two big targets, nothing to type. A tap shows its result at
 * once (`onRated` runs before the server answers, so the next screen is there without a wait) and
 * the save happens behind it: `onSaved` follows when the backend has it, `onFailed` when it
 * could not, so the caller can take the optimistic result back and the student can tap again. If
 * the backend says it already has a rating (a conflict) that counts as saved, since the student's
 * intent is met.
 */
export function RateButtons({
  jobId,
  onRated,
  onSaved,
  onFailed,
  optimistic = true,
  className,
}: {
  jobId: string;
  /** Called at once with the tapped rating, before the save finishes. */
  onRated: (rating: Rating) => void;
  /** Called when the backend has the rating. */
  onSaved?: (rating: Rating) => void;
  /** Called when the save failed: undo what `onRated` showed. */
  onFailed?: (rating: Rating) => void;
  /**
   * Show the result at once (the default). Off for a gate that must not move on before the
   * backend has the rating (rate first, P-20): `onRated` then waits for the save, with a spinner.
   */
  optimistic?: boolean;
  className?: string;
}) {
  const [sending, setSending] = useState<Rating | null>(null);

  async function rate(rating: Rating) {
    if (sending) return;
    setSending(rating);
    if (optimistic) onRated(rating);
    try {
      await pipelineApi.rate(jobId, rating);
    } catch (error) {
      if (!isConflictError(error)) {
        toast.error("Couldn't save that. Please tap again.");
        setSending(null);
        onFailed?.(rating);
        return;
      }
    }
    rememberRated(jobId);
    setSending(null);
    if (!optimistic) onRated(rating);
    onSaved?.(rating);
  }

  const base = 'h-auto min-h-16 flex-1 flex-col gap-1 py-3 text-base fine:min-h-14';
  return (
    <div
      className={cn('flex gap-3', className)}
      role="group"
      aria-label="How did it turn out?"
      data-track="rate"
    >
      <Button
        type="button"
        variant="outline"
        className={base}
        disabled={sending !== null}
        aria-pressed={sending === 'up'}
        onClick={() => void rate('up')}
      >
        {!optimistic && sending === 'up' ? (
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        ) : (
          <ThumbsUp className="size-6 text-status-green-foreground" aria-hidden="true" />
        )}
        Good
      </Button>
      <Button
        type="button"
        variant="outline"
        className={base}
        disabled={sending !== null}
        aria-pressed={sending === 'down'}
        onClick={() => void rate('down')}
      >
        {!optimistic && sending === 'down' ? (
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        ) : (
          <ThumbsDown className="size-6 text-status-red-foreground" aria-hidden="true" />
        )}
        Not great
      </Button>
    </div>
  );
}
