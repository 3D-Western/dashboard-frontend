'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrainingLevel } from '@/hooks/useTraining';
import { cn } from '@/lib/utils';
import { TrainingLevel } from '@/types/training';
import { DashboardSection } from './DashboardSection';

const LEVELS: { level: TrainingLevel; label: string }[] = [
  { level: 'LEVEL_1', label: 'Level 1' },
  { level: 'LEVEL_2', label: 'Level 2' },
];

// Only the user's training level exists in the API for now. Per-certification badges and a
// "Go to training" button come with the training page.
export function TrainingSummary() {
  const { trainingLevel, isLoading, error, refetch } = useTrainingLevel();
  const completed = trainingLevel ? LEVELS.findIndex((l) => l.level === trainingLevel) + 1 : 0;

  return (
    <DashboardSection id="training" title="Training">
      {isLoading ? (
        <div className="space-y-3" role="status" aria-label="Loading training">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-3">
            <Skeleton className="size-14 rounded-lg" />
            <Skeleton className="size-14 rounded-lg" />
          </div>
        </div>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">We couldn&apos;t load your training.</p>
          <Button variant="outline" size="sm" onClick={refetch}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {completed === 0
              ? "You haven't started training yet. Talk to makerspace staff to get started."
              : completed === LEVELS.length
                ? "You've completed every training level."
                : `You've completed Level ${completed}. Level ${completed + 1} is next.`}
          </p>
          <ol
            className="flex gap-3"
            aria-label={`${completed} of ${LEVELS.length} levels complete`}
          >
            {LEVELS.map(({ level, label }, i) => {
              const done = i < completed;
              return (
                <li key={level} className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      'flex size-14 items-center justify-center rounded-lg',
                      done
                        ? 'bg-linear-to-br from-purple-dark to-purple-light text-white'
                        : 'border border-dashed border-border bg-muted',
                    )}
                  >
                    {done && <Check className="size-5" aria-hidden="true" />}
                  </span>
                  <span className={cn('text-xs', !done && 'text-muted-foreground')}>
                    {label}
                    <span className="sr-only">{done ? ' (complete)' : ' (not complete)'}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </DashboardSection>
  );
}
