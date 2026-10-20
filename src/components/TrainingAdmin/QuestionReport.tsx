'use client';

import { useCallback, useState } from 'react';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminResource } from '@/hooks/useAdminResource';
import { useTrainingPermissions } from '@/hooks/useTrainingPermissions';
import { promptPreview } from '@/lib/training-admin-format';
import type { QuestionReportRow } from '@/types/training-admin';
import { CorrectionDialog } from './CorrectionDialog';
import { LoadState } from './feedback';
import { useTraining } from './TrainingContext';

/** Below this share correct, a question is worth a second look. */
export const LOW_PERCENT_CORRECT = 50;

export function sortReport(rows: QuestionReportRow[]): QuestionReportRow[] {
  return [...rows].sort((a, b) => {
    // Never-answered questions go last; otherwise the hardest question first.
    if (a.percentCorrect === null && b.percentCorrect === null) return a.questionId - b.questionId;
    if (a.percentCorrect === null) return 1;
    if (b.percentCorrect === null) return -1;
    return a.percentCorrect - b.percentCorrect;
  });
}

/** /admin/training/[id]/question-report: how each question is doing, and corrections. */
export function QuestionReport() {
  const { training } = useTraining();
  const { canPublish } = useTrainingPermissions();
  const load = useCallback(() => trainingAdminAPI.getQuestionReport(training.id), [training.id]);
  const { data, error, isLoading, reload } = useAdminResource(load);
  const [dialog, setDialog] = useState<{
    row: QuestionReportRow;
    mode: 'correct' | 'rescore';
  } | null>(null);

  const rows = sortReport(data ?? []);

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        How members have answered each question, hardest first. A question that most people get
        wrong may be unclear. Corrections are applied here: an accepted answer counts as right and a
        dropped question is left out.
        {!canPublish && ' Recording a correction needs the "publish trainings" permission.'}
      </p>

      <LoadState
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        onRetry={() => void reload()}
        what="the question report"
      >
        {rows.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No questions have been asked yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Question</th>
                  <th className="px-3 py-2 text-right font-medium">Asked</th>
                  <th className="px-3 py-2 text-right font-medium">Answered</th>
                  <th className="px-3 py-2 text-right font-medium">Correct</th>
                  <th className="px-3 py-2 font-medium">Most common wrong answer</th>
                  <th className="px-3 py-2 text-right font-medium">Corrections</th>
                  <th className="px-3 py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  const low =
                    row.percentCorrect !== null && row.percentCorrect < LOW_PERCENT_CORRECT;
                  return (
                    <tr key={row.questionVersionId} className="align-top">
                      <td className="max-w-xs px-3 py-2">
                        <p className="[overflow-wrap:anywhere]">
                          {promptPreview(row.promptMarkdown, 140)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline">{row.topicSlug}</Badge>
                          <Badge variant="outline">Version {row.versionNo}</Badge>
                          {row.critical && <Badge variant="destructive">Critical</Badge>}
                          {!row.active && <Badge variant="outline">Retired</Badge>}
                          {low && <Badge variant="secondary">Look at this one</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.timesShown}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.timesAnswered}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.percentCorrect === null ? (
                          <span className="text-muted-foreground">n/a</span>
                        ) : (
                          `${Math.round(row.percentCorrect)}%`
                        )}
                      </td>
                      <td className="max-w-[14rem] px-3 py-2 [overflow-wrap:anywhere]">
                        {row.mostChosenWrongOption ? (
                          <>
                            {promptPreview(row.mostChosenWrongOption.label, 60)}{' '}
                            <span className="text-xs text-muted-foreground">
                              ({row.mostChosenWrongOption.timesChosen}{' '}
                              {row.mostChosenWrongOption.timesChosen === 1 ? 'time' : 'times'})
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">none</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.corrections}</td>
                      <td className="px-3 py-2">
                        {canPublish ? (
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              aria-label={`Correct: ${promptPreview(row.promptMarkdown, 40)}`}
                              onClick={() => setDialog({ row, mode: 'correct' })}
                            >
                              Correct...
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={`Re-score: ${promptPreview(row.promptMarkdown, 40)}`}
                              onClick={() => setDialog({ row, mode: 'rescore' })}
                            >
                              Re-score
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </LoadState>

      {dialog && (
        <CorrectionDialog
          row={dialog.row}
          mode={dialog.mode}
          onClose={() => setDialog(null)}
          onRecorded={() => void reload()}
        />
      )}
    </div>
  );
}
