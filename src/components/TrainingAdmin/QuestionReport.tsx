'use client';

import { useCallback, useState } from 'react';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RowCard, ResponsiveTable } from '@/components/ResponsiveTable';
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

type ReportAction = 'correct' | 'rescore';

const isLowShare = (row: QuestionReportRow) =>
  row.percentCorrect !== null && row.percentCorrect < LOW_PERCENT_CORRECT;

function QuestionTags({ row }: { row: QuestionReportRow }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      <Badge variant="outline">{row.topicSlug}</Badge>
      <Badge variant="outline">Version {row.versionNo}</Badge>
      {row.critical && <Badge variant="destructive">Critical</Badge>}
      {!row.active && <Badge variant="outline">Retired</Badge>}
      {isLowShare(row) && <Badge variant="secondary">Look at this one</Badge>}
    </div>
  );
}

function CorrectShare({ row }: { row: QuestionReportRow }) {
  if (row.percentCorrect === null) {
    return <span className="text-muted-foreground">n/a</span>;
  }
  return <>{`${Math.round(row.percentCorrect)}%`}</>;
}

function WrongAnswer({ row }: { row: QuestionReportRow }) {
  if (!row.mostChosenWrongOption) {
    return <span className="text-muted-foreground">none</span>;
  }
  const { label, timesChosen } = row.mostChosenWrongOption;
  return (
    <>
      {promptPreview(label, 60)}{' '}
      <span className="text-xs text-muted-foreground">
        ({timesChosen} {timesChosen === 1 ? 'time' : 'times'})
      </span>
    </>
  );
}

/** One question on a phone: the prompt, the numbers in a row, the wrong answer, then the buttons. */
function QuestionCard({
  row,
  canPublish,
  onAction,
}: {
  row: QuestionReportRow;
  canPublish: boolean;
  onAction: (mode: ReportAction) => void;
}) {
  const promptName = promptPreview(row.promptMarkdown, 40);
  return (
    <RowCard
      title={
        <>
          <p className="[overflow-wrap:anywhere] text-foreground">
            {promptPreview(row.promptMarkdown, 140)}
          </p>
          <QuestionTags row={row} />
        </>
      }
      footer={
        canPublish ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              aria-label={`Correct: ${promptName}`}
              onClick={() => onAction('correct')}
            >
              Correct...
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full"
              aria-label={`Re-score: ${promptName}`}
              onClick={() => onAction('rescore')}
            >
              Re-score
            </Button>
          </div>
        ) : null
      }
    >
      <dl className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div>
          <dt className="text-sm">Asked</dt>
          <dd className="text-base font-medium text-foreground tabular-nums">{row.timesShown}</dd>
        </div>
        <div>
          <dt className="text-sm">Answered</dt>
          <dd className="text-base font-medium text-foreground tabular-nums">
            {row.timesAnswered}
          </dd>
        </div>
        <div>
          <dt className="text-sm">Correct</dt>
          <dd className="text-base font-medium text-foreground tabular-nums">
            <CorrectShare row={row} />
          </dd>
        </div>
      </dl>
      <p>
        Most common wrong answer: <WrongAnswer row={row} />
      </p>
      <p>Corrections: {row.corrections}</p>
    </RowCard>
  );
}

/** /admin/training/[id]/question-report: how each question is doing, and corrections. */
export function QuestionReport() {
  const { training } = useTraining();
  const { canPublish } = useTrainingPermissions();
  const load = useCallback(() => trainingAdminAPI.getQuestionReport(training.id), [training.id]);
  const { data, error, isLoading, reload } = useAdminResource(load);
  const [dialog, setDialog] = useState<{
    row: QuestionReportRow;
    mode: ReportAction;
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
          <ResponsiveTable
            items={rows}
            getKey={(row) => row.questionVersionId}
            emptyMessage="No questions have been asked yet."
            cardsBelow="lg"
            renderCard={(row) => (
              <QuestionCard
                row={row}
                canPublish={canPublish}
                onAction={(mode) => setDialog({ row, mode })}
              />
            )}
          >
            <div className="relative overflow-x-auto rounded-xl border bg-card">
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
                  {rows.map((row) => (
                    <tr key={row.questionVersionId} className="align-top">
                      <td className="max-w-xs px-3 py-2">
                        <p className="[overflow-wrap:anywhere]">
                          {promptPreview(row.promptMarkdown, 140)}
                        </p>
                        <QuestionTags row={row} />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.timesShown}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.timesAnswered}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <CorrectShare row={row} />
                      </td>
                      <td className="max-w-[14rem] px-3 py-2 [overflow-wrap:anywhere]">
                        <WrongAnswer row={row} />
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
                  ))}
                </tbody>
              </table>
            </div>
          </ResponsiveTable>
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
