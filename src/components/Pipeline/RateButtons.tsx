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
 * The one-tap thumbs up / down (P-20). Two big targets, nothing to type. A tap saves at once;
 * if the backend says it already has a rating (a conflict) that counts as done, since the
 * student's intent is met. Any other failure keeps the buttons so a second tap retries.
 */
export function RateButtons({
  jobId,
  onRated,
  className,
}: {
  jobId: string;
  /** Called once the rating is saved. */
  onRated: (rating: Rating) => void;
  className?: string;
}) {
  const [sending, setSending] = useState<Rating | null>(null);

  async function rate(rating: Rating) {
    if (sending) return;
    setSending(rating);
    try {
      await pipelineApi.rate(jobId, rating);
    } catch (error) {
      if (!isConflictError(error)) {
        toast.error("Couldn't save that. Please tap again.");
        setSending(null);
        return;
      }
    }
    rememberRated(jobId);
    setSending(null);
    onRated(rating);
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
        onClick={() => void rate('up')}
      >
        {sending === 'up' ? (
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
        onClick={() => void rate('down')}
      >
        {sending === 'down' ? (
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        ) : (
          <ThumbsDown className="size-6 text-status-red-foreground" aria-hidden="true" />
        )}
        Not great
      </Button>
    </div>
  );
}
