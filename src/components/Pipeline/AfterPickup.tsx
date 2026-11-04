'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  aftercareStep,
  nextQuestion,
  rememberRatingSkipped,
  skippedFollowups,
  wasRated,
  wasRatingSkipped,
} from '@/lib/pipeline-aftercare';
import type { FollowupQuestion, Rating } from '@/types/pipeline';
import { FollowupQuestions } from './FollowupQuestions';
import { QualityReport } from './QualityReport';
import { RateButtons } from './RateButtons';

interface AfterPickupProps {
  jobId: string;
  jobName?: string;
  /** The backend says this collected print still needs its rating (`ratingPending`). */
  ratingPending: boolean | null;
  /** The rating given on this screen, if any. */
  rating: Rating | null;
  /** Follow-up questions from the pipeline, in order, and the ones already answered or skipped. */
  followups: FollowupQuestion[];
  handledFollowups: number[];
  onRated: (rating: Rating) => void;
  onFollowupHandled: (questionId: number) => void;
}

/**
 * After the student collected the print: a one-tap thumbs up/down, a thumbs-down opens the quick
 * optional quality step (P-102), then the targeted follow-up questions one at a time (P-109).
 * Every step can be skipped and nothing comes back once it was (P-92: never annoying). When
 * there is nothing to ask the card is not on screen at all.
 */
export function AfterPickup({
  jobId,
  jobName,
  ratingPending,
  rating,
  followups,
  handledFollowups,
  onRated,
  onFollowupHandled,
}: AfterPickupProps) {
  // Browser facts, read once when the card first shows (it only renders after the data loaded).
  const [skipped] = useState(() => skippedFollowups(jobId));
  const [ratingSkipped, setRatingSkipped] = useState(() => wasRatingSkipped(jobId));
  const [qualityHandled, setQualityHandled] = useState(false);
  // Something was asked in this visit: say thanks at the end instead of vanishing.
  const [engaged, setEngaged] = useState(false);

  const handled = useMemo(() => [...handledFollowups, ...skipped], [handledFollowups, skipped]);
  const remaining = followups.filter((q) => !handled.includes(q.questionId));
  const question = nextQuestion(followups, handled);
  // "1 of 3" counts what is asked in this visit, not questions skipped on an earlier one.
  const askedHere = followups.filter((q) => handledFollowups.includes(q.questionId)).length;

  const isRated = ratingPending !== true || wasRated(jobId) || ratingSkipped;
  // The quality step belongs to the thumbs-down given just now; coming back later never reopens it.
  const step = aftercareStep({
    rated: isRated,
    rating: engaged ? rating : null,
    qualityHandled,
    unanswered: remaining.length,
  });

  if (step === 'done') {
    if (!engaged) return null;
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground"
      >
        <CheckCircle2 className="size-4 text-status-green-foreground" aria-hidden="true" />
        Thanks, that helps us get better for everyone.
      </p>
    );
  }

  return (
    <section
      aria-labelledby="aftercare-heading"
      aria-live="polite"
      className="space-y-4 rounded-lg border bg-card p-4"
      data-testid="after-pickup"
      data-step={step}
    >
      {step === 'rate' && (
        <>
          <div>
            <h2 id="aftercare-heading" className="text-lg font-semibold">
              How did {jobName ? <span className="break-words">{jobName}</span> : 'it'} turn out?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">One tap is plenty.</p>
          </div>
          <RateButtons
            jobId={jobId}
            onRated={(value) => {
              setEngaged(true);
              onRated(value);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              rememberRatingSkipped(jobId);
              setRatingSkipped(true);
            }}
          >
            Not now
          </Button>
        </>
      )}

      {step === 'quality' && (
        <>
          <h2 id="aftercare-heading" className="sr-only">
            Report print quality
          </h2>
          <QualityReport
            jobId={jobId}
            onDone={() => {
              setEngaged(true);
              setQualityHandled(true);
            }}
          />
        </>
      )}

      {step === 'followups' && question && (
        <>
          <h2 id="aftercare-heading" className="sr-only">
            A few quick questions
          </h2>
          <FollowupQuestions
            key={question.questionId}
            jobId={jobId}
            question={question}
            position={askedHere + 1}
            total={askedHere + remaining.length}
            onHandled={(id) => {
              setEngaged(true);
              onFollowupHandled(id);
            }}
          />
        </>
      )}
    </section>
  );
}
