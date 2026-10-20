'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useStartTraining } from '@/hooks/useStartTraining';
import { Routes } from '@/lib/routes';
import { useTrainings } from '@/providers/trainings-provider';

/**
 * Shown until Maker Orientation is done. It leads to the orientation and nothing else: no
 * feature is locked behind it yet (which features to lock is still an open question).
 */
export function OrientationPrompt() {
  const { data, refetch } = useTrainings();
  const { start, startingSlug, error } = useStartTraining(refetch);

  if (!data || data.orientationComplete) return null;
  const orientation = data.trainings.find((t) => t.kind === 'ORIENTATION');
  // Nothing to lead to (none published, or the member can't start it right now)
  if (!orientation) return null;

  const canStartHere = ['START', 'START_REFRESHER', 'START_ADDON'].includes(orientation.nextAction);
  const resumeId = orientation.nextAction === 'RESUME' ? orientation.inProgressAttemptId : null;

  return (
    <section
      aria-labelledby="orientation-prompt-heading"
      className="flex flex-col gap-4 rounded-xl border border-purple-light/50 bg-purple-light/10 p-5 sm:flex-row sm:items-center sm:p-6"
    >
      <Compass className="size-8 shrink-0 text-purple-light" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <h2 id="orientation-prompt-heading" className="text-lg">
          {resumeId ? 'Finish Maker Orientation' : 'Start with Maker Orientation'}
        </h2>
        <p className="text-sm text-muted-foreground">
          It&apos;s the first thing every member does: a short video, some reading and a quiz on
          safety and how the space works. You can stop and pick up where you left off.
        </p>
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
      </div>
      {resumeId ? (
        <Button asChild className="w-full sm:w-auto">
          <Link href={Routes.training.attempt(resumeId)}>Continue orientation</Link>
        </Button>
      ) : canStartHere ? (
        <Button
          type="button"
          onClick={() => void start(orientation.slug)}
          disabled={startingSlug === orientation.slug}
          className="w-full sm:w-auto"
        >
          {startingSlug === orientation.slug ? 'Starting...' : 'Start orientation'}
        </Button>
      ) : (
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={Routes.training.home}>See your training</Link>
        </Button>
      )}
    </section>
  );
}
