'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { Rescore } from '@/types/training-admin';

const STATUS_WORDS: Record<string, string> = {
  PASSED: 'Passed',
  FAILED: 'Failed',
  ABANDONED: 'Abandoned',
  IN_PROGRESS: 'In progress',
};

const percent = (value: number | null) =>
  value === null ? 'n/a' : `${Math.round(value * 10) / 10}%`;

/**
 * The read-only re-score: which finished attempts would pass or fail differently with every
 * correction applied. Nothing is stored; staff decide what to do with the list.
 */
export function RescoreResult({ rescore }: { rescore: Rescore }) {
  const changes = rescore.changedOutcomes;
  return (
    <section className="space-y-3" aria-label="Re-score result">
      <Alert>
        <AlertTitle>Nothing has been changed</AlertTitle>
        <AlertDescription>
          Each finished attempt that was asked this question was graded again with every correction
          applied, against the training&rsquo;s current pass mark ({rescore.passMarkPercent}%). Only
          attempts whose result would differ are listed. No one&rsquo;s record, certification or
          access was touched; decide what to do with each person yourself.
        </AlertDescription>
      </Alert>

      <p className="text-sm">
        {rescore.attemptsRescored} {rescore.attemptsRescored === 1 ? 'attempt' : 'attempts'}{' '}
        re-scored.{' '}
        {changes.length === 0 ? (
          <strong>No attempt&rsquo;s result would change.</strong>
        ) : (
          <strong>
            {changes.length} {changes.length === 1 ? 'result' : 'results'} would change.
          </strong>
        )}
      </p>

      {rescore.skippedAnswers > 0 && (
        <Alert variant="warning">
          <AlertDescription>
            {rescore.skippedAnswers} stored {rescore.skippedAnswers === 1 ? 'answer' : 'answers'}{' '}
            could not be read, so those attempts are left out rather than guessed at. Tell a
            developer.
          </AlertDescription>
        </Alert>
      )}

      {changes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Attempt</th>
                <th className="px-3 py-2 font-medium">Was</th>
                <th className="px-3 py-2 font-medium">Would be</th>
                <th className="px-3 py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {changes.map((change) => (
                <tr key={change.attemptId}>
                  <td className="px-3 py-2">{change.studentId}</td>
                  <td className="px-3 py-2">#{change.attemptId}</td>
                  <td className="px-3 py-2">
                    {STATUS_WORDS[change.storedStatus] ?? change.storedStatus}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={change.correctedPass ? 'default' : 'destructive'}>
                      {change.correctedPass ? 'Would pass' : 'Would fail'}
                    </Badge>
                    {!change.criticalAllCorrect && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        a critical question is wrong
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {percent(change.storedScorePercent)} to {percent(change.correctedScorePercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
