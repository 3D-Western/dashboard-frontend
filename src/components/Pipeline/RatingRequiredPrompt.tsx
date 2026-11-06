'use client';

import { useState } from 'react';
import type { UnratedPrint } from '@/types/pipeline';
import { QualityReport } from './QualityReport';
import { RateButtons } from './RateButtons';

/**
 * Rate first (SCOPE §2.1, P-20): the backend will not start a new 3D-print job while a collected
 * print has no rating, and says which prints those are. One tap each (oldest first), a thumbs-down
 * offers the quick optional quality step, and when the last one is rated `onDone` lets the upload
 * carry on with the file the student already chose. A hard block on the backend's side, so there
 * is no skip: the cost is one tap per print.
 */
export function RatingRequiredPrompt({
  prints,
  onDone,
  fileChosen = true,
}: {
  prints: UnratedPrint[];
  /** Every listed print is rated: try the submission again. */
  onDone: () => void;
  /** False on the look-ahead, before any file is chosen: the upload follows the rating. */
  fileChosen?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [qualityFor, setQualityFor] = useState<string | null>(null);

  // An empty list (the backend said "rate first" but not what) leaves nothing to show: just retry.
  const print = prints[index];
  if (!print) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {fileChosen
          ? 'Thanks. Continuing with your upload.'
          : 'Thanks. You can choose your file now.'}
      </p>
    );
  }

  const next = () => {
    setQualityFor(null);
    if (index + 1 >= prints.length) onDone();
    setIndex((current) => current + 1);
  };

  return (
    <section
      aria-labelledby="rating-required-heading"
      aria-live="polite"
      className="space-y-4 rounded-xl border bg-card p-5"
      data-testid="rating-required"
    >
      {qualityFor === print.jobId ? (
        <>
          <h2 id="rating-required-heading" className="sr-only">
            Report print quality
          </h2>
          <QualityReport jobId={print.jobId} onDone={next} />
        </>
      ) : (
        <>
          <div>
            <h2 id="rating-required-heading" className="text-lg font-semibold">
              Before you start: how did{' '}
              <span className="break-words">{print.name || 'your last print'}</span> turn out?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {fileChosen
                ? 'One tap, then your file goes up.'
                : 'One tap, then you can choose your file.'}
              {prints.length > 1 && ` (${index + 1} of ${prints.length})`}
            </p>
          </div>
          <RateButtons
            jobId={print.jobId}
            // A hard gate: it moves on only once the backend has the rating.
            optimistic={false}
            onRated={(rating) => (rating === 'down' ? setQualityFor(print.jobId) : next())}
          />
        </>
      )}
    </section>
  );
}
