'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { pipelineApi } from '@/api/client/pipeline';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { QUALITY_REASONS, QUALITY_TEXT_MAX } from '@/lib/pipeline-aftercare';
import { cn } from '@/lib/utils';
import type { QualityReason } from '@/types/pipeline';

/**
 * "Report print quality", the quick optional step after a thumbs-down (P-102): a few reason
 * chips and, if they like, a few words. Framed as helping everyone, never as a form to finish;
 * "No thanks" is always right there. Words with no chip are sent as "something else", because the
 * pipeline needs at least one reason.
 */
export function QualityReport({
  jobId,
  onDone,
}: {
  jobId: string;
  /** Sent, or skipped: either way this step is over. */
  onDone: () => void;
}) {
  const [reasons, setReasons] = useState<QualityReason[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = reasons.length > 0 || text.trim().length > 0;

  function toggle(reason: QualityReason) {
    setReasons((current) =>
      current.includes(reason) ? current.filter((r) => r !== reason) : [...current, reason],
    );
  }

  async function send() {
    if (!canSend || sending) return;
    setSending(true);
    try {
      await pipelineApi.reportQuality(jobId, {
        reasons: reasons.length > 0 ? reasons : ['other'],
        text,
      });
      toast.success('Thanks. That helps everyone who prints here.');
      onDone();
    } catch {
      toast.error("Couldn't send that. You can try again, or skip it.");
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Sorry it wasn&apos;t great</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Help improve our system for everyone by sharing what was off. It takes ten seconds, and
          you can skip it.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="What was off?">
        {QUALITY_REASONS.map((reason) => {
          const on = reasons.includes(reason.value);
          return (
            <button
              key={reason.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(reason.value)}
              className={cn(
                'min-h-11 rounded-full border border-control-border px-3.5 py-1.5 text-sm transition-colors outline-none hover:border-purple-light focus-visible:ring-3 focus-visible:ring-ring/50 fine:min-h-0',
                on && 'border-purple-light bg-purple-light/25',
              )}
            >
              {reason.label}
            </button>
          );
        })}
      </div>

      <Textarea
        aria-label="Anything else? (optional)"
        value={text}
        maxLength={QUALITY_TEXT_MAX}
        onChange={(event) => setText(event.target.value)}
        placeholder="Anything else? (optional)"
        className="min-h-20"
      />

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="button"
          size="lg"
          disabled={!canSend || sending}
          onClick={() => void send()}
          className="w-full sm:w-auto sm:min-w-32"
        >
          {sending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Send
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          disabled={sending}
          onClick={onDone}
          className="w-full sm:w-auto"
        >
          No thanks
        </Button>
      </div>
    </div>
  );
}
