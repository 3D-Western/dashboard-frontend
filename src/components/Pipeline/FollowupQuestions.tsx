'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { isConflictError, pipelineApi } from '@/api/client/pipeline';
import { Button } from '@/components/ui/button';
import { FOLLOWUP_ANSWERS, rememberFollowupSkipped } from '@/lib/pipeline-aftercare';
import type { FollowupAnswer, FollowupQuestion } from '@/types/pipeline';

/**
 * One targeted follow-up question at a time (P-109): yes, no or not sure, or skip. A skipped
 * question is remembered in this browser so it is not asked again on the next visit. A conflict
 * from the backend (already answered somewhere else) simply moves on.
 */
export function FollowupQuestions({
  jobId,
  question,
  position,
  total,
  onHandled,
}: {
  jobId: string;
  question: FollowupQuestion;
  /** 1-based place of this question among the ones still to ask, for "1 of 3". */
  position: number;
  total: number;
  /** Answered or skipped: the next question can show. */
  onHandled: (questionId: number) => void;
}) {
  const [sending, setSending] = useState<FollowupAnswer | null>(null);

  async function answer(value: FollowupAnswer) {
    if (sending) return;
    setSending(value);
    try {
      await pipelineApi.answerFollowup(jobId, question.questionId, value);
    } catch (error) {
      if (!isConflictError(error)) {
        toast.error("Couldn't save that answer. Please tap again, or skip.");
        setSending(null);
        return;
      }
    }
    setSending(null);
    onHandled(question.questionId);
  }

  function skip() {
    rememberFollowupSkipped(jobId, question.questionId);
    onHandled(question.questionId);
  }

  return (
    <div className="space-y-4" data-testid="followup-question">
      <div>
        <p className="eyebrow text-xs text-muted-foreground">
          Quick question {position} of {total}
        </p>
        <h3 className="mt-1 text-base font-semibold">{question.text}</h3>
      </div>
      <div className="flex gap-2" role="group" aria-label="Your answer">
        {FOLLOWUP_ANSWERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            disabled={sending !== null}
            onClick={() => void answer(option.value)}
            className="h-auto min-h-12 flex-1 text-base"
          >
            {sending === option.value && <Loader2 className="animate-spin" aria-hidden="true" />}
            {option.label}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={sending !== null}
        onClick={skip}
        className="text-muted-foreground"
      >
        Skip this one
      </Button>
    </div>
  );
}
