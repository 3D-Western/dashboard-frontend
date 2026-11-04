'use client';

import { useState } from 'react';
import { Loader2, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { isConflictError, pipelineApi } from '@/api/client/pipeline';
import { Button } from '@/components/ui/button';

/**
 * "I've collected it" (P-78): the student's tap that the part is in their hands. A conflict
 * means the pipeline does not think anything is ready to collect (already marked, or not done),
 * so the screen re-reads the job instead of leaving a button that cannot work.
 */
export function CollectButton({
  jobId,
  onCollected,
  onConflict,
}: {
  jobId: string;
  /** The pipeline took it. */
  onCollected: () => void;
  /** The pipeline said nothing is ready to collect: re-read the job. */
  onConflict?: () => void;
}) {
  const [sending, setSending] = useState(false);

  async function collect() {
    if (sending) return;
    setSending(true);
    try {
      await pipelineApi.collected(jobId);
      onCollected();
    } catch (error) {
      if (isConflictError(error)) {
        toast.info('That print is not marked as ready to collect. Checking again.');
        onConflict?.();
      } else {
        toast.error("Couldn't save that. Please tap again.");
      }
      setSending(false);
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      disabled={sending}
      onClick={() => void collect()}
      className="h-auto min-h-12 w-full text-base"
    >
      {sending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <PackageCheck aria-hidden="true" />
      )}
      I&apos;ve collected it
    </Button>
  );
}
