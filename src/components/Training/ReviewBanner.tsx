'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import type { ReviewControls } from './TrainingRuntime';

/**
 * Shown above the material in review mode. It stays in view while scrolling, and says plainly that
 * nothing here is recorded or graded.
 */
export function ReviewBanner({ review }: { review: ReviewControls }) {
  return (
    <div
      role="status"
      className="sticky top-0 z-20 -mx-4 border-b border-purple-light/40 bg-purple-light/10 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-lg sm:border"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <BookOpen className="size-4 shrink-0" aria-hidden="true" />
        <p className="font-semibold">Review: nothing is recorded</p>
        <p className="text-sm text-muted-foreground">
          There is no quiz here, and nothing you do counts toward your attempts.
        </p>
        <Link
          href={review.exitHref}
          className="ml-auto inline-flex min-h-11 items-center text-sm underline fine:min-h-0"
        >
          Back to my results
        </Link>
      </div>
    </div>
  );
}
