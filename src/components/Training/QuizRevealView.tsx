'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { Markdown } from '@/components/Markdown';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { QuizReveal } from '@/types/training-preview';
import { QuestionCard } from './QuestionCard';

interface QuizRevealViewProps {
  reveal: QuizReveal;
  retaking: boolean;
  onRetake: () => void;
  /** Only offered after a pass: carries on to the next step. */
  onContinue: () => void;
}

/**
 * Staff preview only: how the submitted quiz went, with the right answers and explanations marked.
 * A student never sees this (the learner API sends no answers), which is why it exists only behind
 * preview mode.
 */
export function QuizRevealView({ reveal, retaking, onRetake, onContinue }: QuizRevealViewProps) {
  const { result, questions } = reveal;
  const right = questions.filter((q) => q.correct).length;
  const scored = questions.filter((q) => !q.dropped).length;

  return (
    <div className="space-y-5" data-testid="quiz-reveal">
      <section
        aria-labelledby="reveal-heading"
        className={cn(
          'space-y-2 rounded-xl border p-4',
          result.passed
            ? 'border-status-green/50 bg-status-green/5'
            : 'border-status-red/50 bg-status-red/5',
        )}
      >
        <div className="flex items-center gap-2">
          {result.passed ? (
            <CheckCircle2 className="size-6 shrink-0 text-status-green" aria-hidden="true" />
          ) : (
            <XCircle className="size-6 shrink-0 text-status-red" aria-hidden="true" />
          )}
          <h4 id="reveal-heading" className="text-lg font-semibold">
            {result.passed ? 'A student would pass' : 'A student would not pass'}
          </h4>
        </div>
        <p className="text-sm">
          {right} of {scored} right ({Math.round(Number(result.scorePercent))}%). The pass mark is{' '}
          {result.passMarkPercent}%.
        </p>
        {!result.criticalAllCorrect && (
          <p className="text-sm">
            A safety-critical question was missed. Those must all be right, whatever the score.
          </p>
        )}
        {result.reviewSteps.length > 0 && (
          <p className="text-sm">
            A student would be sent back to:{' '}
            {result.reviewSteps.map((step) => step.title).join(', ')}.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Staff only: students are never shown which answers were right.
        </p>
      </section>

      <ol className="space-y-5">
        {questions.map((item, index) => (
          <li key={item.question.questionVersionId} className="space-y-3 rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Question {index + 1}</span>
              {item.dropped ? (
                <Badge variant="outline">Dropped by a correction</Badge>
              ) : item.correct ? (
                <Badge variant="outline" className="border-status-green text-status-green">
                  Right
                </Badge>
              ) : (
                <Badge variant="outline" className="border-status-red text-status-red">
                  Missed
                </Badge>
              )}
              {item.critical && <Badge variant="outline">Safety-critical</Badge>}
            </div>
            <QuestionCard
              question={item.question}
              selected={item.selected}
              onChange={() => undefined}
              disabled
              reveal={{ correctOptionIds: item.correctOptionIds }}
            />
            {item.explanationMarkdown && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="mb-1 font-medium">Explanation</p>
                <Markdown>{item.explanationMarkdown}</Markdown>
              </div>
            )}
          </li>
        ))}
      </ol>

      <Alert>
        <AlertDescription>
          Retaking is instant here. A real student waits out the retry cooldown after a fail.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row">
        {result.passed && (
          <Button type="button" onClick={onContinue} className="w-full sm:w-auto">
            Continue
          </Button>
        )}
        <Button
          type="button"
          variant={result.passed ? 'outline' : 'default'}
          onClick={onRetake}
          disabled={retaking}
          className="w-full sm:w-auto"
        >
          {retaking ? 'Drawing the quiz...' : 'Retake the quiz'}
        </Button>
      </div>
    </div>
  );
}
