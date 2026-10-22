'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStartTraining } from '@/hooks/useStartTraining';
import { useTrainings } from '@/providers/trainings-provider';
import { TrainingCard } from './TrainingCard';

/** /dashboard/training: every training I can take, and where I stand on each. */
export function TrainingList() {
  const { data, isLoading, error, refetch } = useTrainings();
  const { start, startingSlug, error: startError } = useStartTraining(refetch);

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading your training">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertDescription>We couldn&apos;t load your training.</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  // Orientation first, then the rest by name
  const trainings = [...data.trainings].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'ORIENTATION' ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-6">
      {trainings.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          There are no trainings to take yet. Check back soon.
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {trainings.map((training) => (
            <TrainingCard
              key={training.slug}
              training={training}
              starting={startingSlug === training.slug}
              errorMessage={startError?.slug === training.slug ? startError.message : null}
              onStart={(slug) => void start(slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
