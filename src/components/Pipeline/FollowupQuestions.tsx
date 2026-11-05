'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { isConflictError, pipelineApi } from '@/api/client/pipeline';
import { Button } from '@/components/ui/button';
import { FOLLOWUP_ANSWERS } from '@/lib/pipeline-aftercare';
import type { FollowupAnswer, FollowupQuestion } from '@/types/pipeline';

/**
 * Up to two targeted follow-up questions (P-109), shown together as rows right under the rating:
 * each is yes, no or not sure, one tap, in any order. Not answering is the way to skip, so there is
 * no "skip" to tap and nothing comes back as a sequence. A conflict from the backend (already
 * answered somewhere else) counts as answered.
 */
export function FollowupQuestions({
  jobId,
  questions,
  handled,
  onHandled,
}: {
  jobId: string;
  questions: FollowupQuestion[];
  /** Question ids already answered (here or earlier): their rows say thanks. */
  handled: readonly number[];
  onHandled: (questionId: number) => void;
}) {
  return (
    <div className="space-y-4" data-testid="followup-questions">
      {questions.map((question) => (
        <FollowupRow
          key={question.questionId}
          jobId={jobId}
          question={question}
          done={handled.includes(question.questionId)}
          onHandled={onHandled}
        />
      ))}
    </div>
  );
}

function FollowupRow({
  jobId,
  question,
  done,
  onHandled,
}: {
  jobId: string;
  question: FollowupQuestion;
  done: boolean;
  onHandled: (questionId: number) => void;
}) {
  const [sending, setSending] = useState<FollowupAnswer | null>(null);
  const answered = done;

  async function answer(value: FollowupAnswer) {
    if (sending) return;
    setSending(value);
    try {
      await pipelineApi.answerFollowup(jobId, question.questionId, value);
    } catch (error) {
      if (!isConflictError(error)) {
        toast.error("Couldn't save that answer. Please tap again.");
        setSending(null);
        return;
      }
    }
    setSending(null);
    onHandled(question.questionId);
  }

  return (
    <div className="space-y-2" data-testid="followup-question" data-track="followup_answer">
      <p className="text-sm font-medium">{question.text}</p>
      {answered ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
          <Check className="size-4 text-status-green-foreground" aria-hidden="true" />
          Thanks
        </p>
      ) : (
        <div className="flex gap-2" role="group" aria-label={`Your answer: ${question.text}`}>
          {FOLLOWUP_ANSWERS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              disabled={sending !== null}
              onClick={() => void answer(option.value)}
              className="h-auto min-h-11 flex-1 text-sm"
            >
              {sending === option.value && <Loader2 className="animate-spin" aria-hidden="true" />}
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
