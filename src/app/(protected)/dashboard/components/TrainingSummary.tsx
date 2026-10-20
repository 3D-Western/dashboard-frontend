'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CertificationBadge } from '@/components/Training/CertificationBadge';
import { displayStatus, isCertified, isNotPassed } from '@/lib/training-format';
import { Routes } from '@/lib/routes';
import { useTrainings } from '@/providers/trainings-provider';
import type { TrainingSummary as Training } from '@/types/training';
import { DashboardSection } from './DashboardSection';

/** The one thing worth nudging a member about: finish something, or start something. */
function nextStepFor(trainings: Training[]): string | null {
  const resume = trainings.find((t) => t.nextAction === 'RESUME');
  if (resume) return `Pick up ${resume.title} where you left off.`;
  const due = trainings.find(
    (t) => t.nextAction === 'START_REFRESHER' || t.nextAction === 'START_ADDON',
  );
  if (due) {
    return due.nextAction === 'START_REFRESHER'
      ? `${due.title} needs a quick refresher.`
      : `${due.title} has new material to complete.`;
  }
  const waiting = trainings.find((t) => t.nextAction === 'AWAITING_SIGNOFF');
  if (waiting) return `${waiting.title}: find a supervisor for your in-person sign-off.`;
  const retry = trainings.find((t) => isNotPassed(t) && t.nextAction === 'START');
  if (retry) return `You haven't passed ${retry.title} yet. Try it again when you're ready.`;
  const waitingToRetry = trainings.find((t) => isNotPassed(t) && t.nextAction === 'BLOCKED');
  if (waitingToRetry) return `You haven't passed ${waitingToRetry.title} yet.`;
  const fresh = trainings.find((t) => t.nextAction === 'START');
  if (fresh) return `Start ${fresh.title}.`;
  return null;
}

export function TrainingSummary() {
  const { data, isLoading, error, refetch } = useTrainings();

  return (
    <DashboardSection id="training" title="Training">
      {isLoading ? (
        <div className="space-y-3" role="status" aria-label="Loading training">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : error || !data ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">We couldn&apos;t load your training.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <TrainingSummaryBody trainings={data.trainings} />
      )}
    </DashboardSection>
  );
}

function TrainingSummaryBody({ trainings }: { trainings: Training[] }) {
  if (trainings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        There are no trainings to take yet. Check back soon.
      </p>
    );
  }

  const certified = trainings.filter(isCertified).length;
  const next = nextStepFor(trainings);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {certified === 0
          ? "You aren't certified in anything yet."
          : `You're certified in ${certified} of ${trainings.length} ${trainings.length === 1 ? 'training' : 'trainings'}.`}
        {next && ` ${next}`}
      </p>
      <ul className="divide-y rounded-lg border">
        {trainings.map((training) => (
          <li
            key={training.slug}
            className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
          >
            <span className="min-w-0 truncate">{training.title}</span>
            <CertificationBadge status={displayStatus(training)} />
          </li>
        ))}
      </ul>
      <Button asChild variant="outline" className="w-full">
        <Link href={Routes.training.home}>Go to training</Link>
      </Button>
    </div>
  );
}
