'use client';

import { useEffect, useRef, useState } from 'react';
import { useTrainingRuntime } from './TrainingRuntime';
import { trainingErrorMessage } from '@/api/client/training-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/Markdown';
import type { AttemptStep } from '@/types/training';
import { QuestionCard } from './QuestionCard';

interface ReadingStepProps {
  attemptId: number;
  step: AttemptStep;
  onStepCompleted: () => void;
}

export function ReadingStep({ attemptId, step, onStepCompleted }: ReadingStepProps) {
  const { api } = useTrainingRuntime();
  const reading = step.reading!;
  const gate = reading.gateQuestion ?? null;
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongAnswer, setWrongAnswer] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setWrongAnswer(false);
    try {
      const dwellSeconds =
        reading.dwellSeconds + Math.round((Date.now() - openedAt.current) / 1000);
      const result = await api.completeReading(attemptId, step.stepId, {
        dwellSeconds,
        ...(gate ? { optionIds: selected } : {}),
      });
      if (result.stepCompleted) {
        onStepCompleted();
      } else {
        // The gate question was wrong. We don't say which answer was right.
        setWrongAnswer(true);
        setSelected([]);
      }
    } catch (err) {
      setError(trainingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Markdown>{reading.bodyMarkdown}</Markdown>

      {gate && (
        <div className="space-y-3 rounded-lg border border-purple-light/50 bg-purple-light/5 p-4">
          <p className="text-sm font-medium text-purple-light">Check your understanding</p>
          <QuestionCard
            question={gate}
            selected={selected}
            onChange={setSelected}
            disabled={busy}
          />
        </div>
      )}

      {wrongAnswer && (
        <Alert variant="warning" role="status">
          <AlertDescription>
            That wasn&apos;t right. Read the section again, then try once more.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        onClick={() => void submit()}
        disabled={busy || (!!gate && selected.length === 0)}
        className="w-full sm:w-auto"
      >
        {busy ? 'Saving...' : gate ? 'Check answer and continue' : "I've read this, continue"}
      </Button>
    </div>
  );
}
