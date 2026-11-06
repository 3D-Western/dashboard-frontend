'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { inlineFollowups, wasRated } from '@/lib/pipeline-aftercare';
import type { FollowupQuestion, Rating } from '@/types/pipeline';
import { FollowupQuestions } from './FollowupQuestions';
import { QualityReport } from './QualityReport';
import { RateButtons } from './RateButtons';

interface AfterPickupProps {
  jobId: string;
  jobName?: string;
  /** The backend says this print still needs its rating (`ratingPending`). */
  ratingPending: boolean | null;
  /** The rating given on this screen, if any. */
  rating: Rating | null;
  /** Follow-up questions from the pipeline, in order, and the ones already answered here. */
  followups: FollowupQuestion[];
  handledFollowups: number[];
  /** The tap, shown at once; the save follows (`onRateSaved`) or fails (`onRateFailed`). */
  onRated: (rating: Rating) => void;
  onRateSaved?: (rating: Rating) => void;
  onRateFailed?: (rating: Rating) => void;
  onFollowupHandled: (questionId: number) => void;
}

/**
 * What the student can say about a print, in one card and no sequence (P-136, P-137): the one-tap
 * thumbs up/down (a rating implies they have the print, so there is nothing to confirm first), the
 * optional quality step right below after a thumbs-down, and at most two follow-up questions (P-109)
 * under them. Everything is optional and in any order; nothing is a separate screen. When there is
 * nothing to ask, the card is not on screen at all.
 */
export function AfterPickup({
  jobId,
  jobName,
  ratingPending,
  rating,
  followups,
  handledFollowups,
  onRated,
  onRateSaved,
  onRateFailed,
  onFollowupHandled,
}: AfterPickupProps) {
  // Browser fact, read once when the card first shows (it only renders after the data loaded).
  const [alreadyRated] = useState(() => wasRated(jobId));
  const [qualityHandled, setQualityHandled] = useState(false);
  // Something was done in this visit: say thanks at the end instead of vanishing.
  const [engaged, setEngaged] = useState(false);

  // The (at most two) questions are fixed the first time there are any, so answering one never
  // brings a third in: the card stays the same size and is never a sequence.
  const [shown, setShown] = useState<FollowupQuestion[] | null>(null);
  const candidates = inlineFollowups(followups, handledFollowups);
  if (shown === null && candidates.length > 0) setShown(candidates);
  const questions = shown ?? [];
  const questionsOpen = questions.some((q) => !handledFollowups.includes(q.questionId));
  const needsRating = ratingPending === true && !alreadyRated && rating === null;
  const showQuality = rating === 'down' && !qualityHandled;

  if (!needsRating && !showQuality && !questionsOpen) {
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
      className="space-y-5 rounded-lg border bg-card p-4"
      data-testid="after-pickup"
    >
      {needsRating && (
        <div className="space-y-4">
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
            onSaved={onRateSaved}
            onFailed={(value) => {
              setEngaged(false);
              onRateFailed?.(value);
            }}
          />
        </div>
      )}

      {showQuality && (
        <div>
          {!needsRating && (
            <h2 id="aftercare-heading" className="sr-only">
              Report print quality
            </h2>
          )}
          <QualityReport
            jobId={jobId}
            onDone={() => {
              setEngaged(true);
              setQualityHandled(true);
            }}
          />
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-3">
          {!needsRating && !showQuality && (
            <h2 id="aftercare-heading" className="text-base font-semibold">
              {questions.length === 1 ? 'One quick question' : 'Two quick questions'}
            </h2>
          )}
          <FollowupQuestions
            jobId={jobId}
            questions={questions}
            handled={handledFollowups}
            onHandled={(id) => {
              setEngaged(true);
              onFollowupHandled(id);
            }}
          />
        </div>
      )}
    </section>
  );
}
