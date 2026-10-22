'use client';

import { useState } from 'react';
import { HandHeart } from 'lucide-react';
import { useTrainingRuntime } from './TrainingRuntime';
import { trainingErrorMessage } from '@/api/client/training-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/Markdown';
import type { Attempt } from '@/types/training';

interface PledgeScreenProps {
  attempt: Attempt;
  onAccepted: (attempt: Attempt) => void;
}

/** The honour pledge, shown before the first step (D-16). Nothing else works until it's accepted. */
export function PledgeScreen({ attempt, onAccepted }: PledgeScreenProps) {
  const { api } = useTrainingRuntime();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      onAccepted(await api.acceptPledge(attempt.attemptId));
    } catch (err) {
      setError(trainingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="pledge-heading"
      className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <HandHeart className="size-7 shrink-0 text-purple-light" aria-hidden="true" />
        <h2 id="pledge-heading" className="text-xl">
          Before you begin
        </h2>
      </div>
      <Markdown>{attempt.pledgeText}</Markdown>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        onClick={() => void accept()}
        disabled={busy}
        className="w-full sm:w-auto"
      >
        {busy ? 'Saving...' : 'I agree, start the training'}
      </Button>
    </section>
  );
}
