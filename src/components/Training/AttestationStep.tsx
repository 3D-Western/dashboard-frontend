'use client';

import { useId, useState } from 'react';
import { trainingAPI } from '@/api/client/training';
import { trainingErrorMessage } from '@/api/client/training-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/Markdown';
import type { AttemptStep } from '@/types/training';

interface AttestationStepProps {
  attemptId: number;
  step: AttemptStep;
  onStepCompleted: () => void;
}

export function AttestationStep({ attemptId, step, onStepCompleted }: AttestationStepProps) {
  const checkboxId = useId();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await trainingAPI.acceptAttestation(attemptId, step.stepId);
      onStepCompleted();
    } catch (err) {
      setError(trainingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card p-4">
        <Markdown>{step.attestation?.text ?? ''}</Markdown>
      </div>

      <label
        htmlFor={checkboxId}
        className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border px-3 py-3"
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          disabled={busy}
          className="mt-0.5 size-5 shrink-0 accent-purple-light"
        />
        <span>I have read and understood the statement above.</span>
      </label>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        onClick={() => void submit()}
        disabled={!accepted || busy}
        className="w-full sm:w-auto"
      >
        {busy ? 'Saving...' : 'Confirm and continue'}
      </Button>
    </div>
  );
}
