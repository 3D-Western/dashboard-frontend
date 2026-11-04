'use client';

import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { pipelineApi } from '@/api/client/pipeline';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CONTACT_EMAIL } from '@/constants/website';

const MAX_LENGTH = 2000;

/**
 * "Report a problem", always in reach (SCOPE §2.8, P-91): a tab pinned to the right edge of the
 * screen on every job screen. With a `jobId` the report goes to the crew tied to that job; on
 * screens without one (the job list) it points at the club's email.
 */
export function ReportProblem({ jobId }: { jobId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!jobId || !text.trim()) return;
    setSending(true);
    try {
      await pipelineApi.report(jobId, text.trim());
      toast.success('Thanks. The crew has your report.');
      setText('');
      setOpen(false);
    } catch {
      toast.error("Couldn't send your report. Please try again, or email us.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="fixed top-1/2 right-0 z-40 flex min-h-32 w-11 -translate-y-1/2 items-center justify-center gap-2 rounded-l-lg border border-r-0 border-control-border bg-card text-sm font-medium shadow-md outline-none [writing-mode:vertical-rl] hover:border-purple-light hover:bg-purple-light/10 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Flag className="size-4 rotate-90" aria-hidden="true" />
          Report a problem
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            {jobId
              ? 'Tell the crew what went wrong. Include what you expected and what you saw.'
              : `Tell us what went wrong, and which job it was. Email ${CONTACT_EMAIL}.`}
          </DialogDescription>
        </DialogHeader>
        {jobId ? (
          <>
            <Textarea
              aria-label="What went wrong?"
              value={text}
              maxLength={MAX_LENGTH}
              onChange={(event) => setText(event.target.value)}
              placeholder="e.g. The preview doesn't look like my part."
              className="min-h-28"
            />
            <DialogFooter>
              <Button type="button" onClick={send} disabled={sending || !text.trim()}>
                {sending && <Loader2 className="animate-spin" aria-hidden="true" />}
                Send report
              </Button>
            </DialogFooter>
          </>
        ) : (
          <DialogFooter>
            <Button asChild>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Problem with my print')}`}
              >
                Email the crew
              </a>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
