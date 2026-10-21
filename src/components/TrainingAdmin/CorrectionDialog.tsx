'use client';

import { useEffect, useState } from 'react';
import { trainingAdminAPI } from '@/api/client/training-admin';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { adminErrorMessage, issuesFromError } from '@/lib/training-admin-errors';
import { describeCorrectionPreview, promptPreview } from '@/lib/training-admin-format';
import { formatDate } from '@/lib/training-format';
import type {
  Correction,
  CorrectionBody,
  CorrectionKind,
  CorrectionPreview,
  QuestionOption,
  QuestionReportRow,
  Rescore,
} from '@/types/training-admin';
import { SelectField, TextAreaField } from './fields';
import { ErrorNote, IssueList } from './feedback';
import { RescoreResult } from './RescoreResult';

export const MAX_CORRECTION_REASON = 2000;

const KIND_TEXT: Record<CorrectionKind, { label: string; help: string }> = {
  ACCEPT_OPTION: {
    label: 'Also accept another answer',
    help: 'Use when two answers are both defensible. The chosen option counts as correct, for new and past attempts.',
  },
  DROP_QUESTION: {
    label: 'Drop the question',
    help: 'Use when the question is wrong or ambiguous. It no longer counts toward anyone’s score, and it is left out of new quizzes.',
  },
};

interface CorrectionDialogProps {
  row: QuestionReportRow;
  /** `rescore` only re-runs the read-only re-score; `correct` records a correction first. */
  mode: 'correct' | 'rescore';
  onClose: () => void;
  /** A correction was recorded, so the report should be reloaded. */
  onRecorded: () => void;
}

/** Records a correction on a published question, or re-scores attempts, and shows the result. */
export function CorrectionDialog({ row, mode, onClose, onRecorded }: CorrectionDialogProps) {
  const [options, setOptions] = useState<QuestionOption[] | null>(null);
  const [history, setHistory] = useState<Correction[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [kind, setKind] = useState<CorrectionKind>('ACCEPT_OPTION');
  const [optionId, setOptionId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<ReturnType<typeof issuesFromError>>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [rescore, setRescore] = useState<Rescore | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<CorrectionPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const run = async () => {
      try {
        const [question, corrections] = await Promise.all([
          trainingAdminAPI.getQuestion(row.questionId),
          trainingAdminAPI.listCorrections(row.questionVersionId),
        ]);
        if (!current) return;
        const version = question.versions?.find((v) => v.id === row.questionVersionId);
        setOptions(version?.options ?? []);
        setHistory(corrections);
        if (mode === 'rescore') {
          const result = await trainingAdminAPI.rescore(row.questionVersionId);
          if (current) setRescore(result);
        }
      } catch (error) {
        if (current) setLoadError(adminErrorMessage(error, "We couldn't load that question."));
      }
    };
    void run();
    return () => {
      current = false;
    };
  }, [row.questionId, row.questionVersionId, mode]);

  const reasonTooLong = reason.length > MAX_CORRECTION_REASON;
  const canSave =
    reason.trim() !== '' &&
    !reasonTooLong &&
    (kind === 'DROP_QUESTION' || optionId !== '') &&
    !saving;

  const correctionBody = (): CorrectionBody => ({
    kind,
    ...(kind === 'ACCEPT_OPTION' ? { optionId: Number(optionId) } : {}),
    reason: reason.trim(),
  });

  /** Works out, with the server, what this correction would do before the user is asked to confirm. */
  const askToConfirm = async () => {
    setConfirming(true);
    setPreview(null);
    setPreviewError(null);
    try {
      setPreview(await trainingAdminAPI.previewCorrection(row.questionVersionId, correctionBody()));
    } catch (error) {
      setPreviewError(adminErrorMessage(error, "We couldn't work out what this would change."));
    }
  };

  const chosenOption = (options ?? []).find((option) => String(option.id) === optionId);

  const save = async () => {
    setConfirming(false);
    setSaving(true);
    setFailure(null);
    setIssues([]);
    try {
      const correction = await trainingAdminAPI.addCorrection(
        row.questionVersionId,
        correctionBody(),
      );
      setRecorded(true);
      setHistory((current) => [...current, correction]);
      setRescore(correction.rescore ?? null);
      onRecorded();
    } catch (error) {
      setIssues(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't record that correction."));
    } finally {
      setSaving(false);
    }
  };

  const showForm = mode === 'correct' && !recorded;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'rescore' ? 'Re-score attempts' : 'Correct this question'}
          </DialogTitle>
          <DialogDescription>{promptPreview(row.promptMarkdown, 140)}</DialogDescription>
        </DialogHeader>

        <ErrorNote message={loadError} />

        {history.length > 0 && (
          <section className="space-y-1" aria-label="Earlier corrections">
            <h4 className="text-sm font-medium">Earlier corrections</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {history.map((correction) => (
                <li key={correction.id}>
                  {correction.kind === 'DROP_QUESTION'
                    ? 'Dropped the question'
                    : 'Accepted another answer'}
                  {' on '}
                  {formatDate(correction.createdAt)}: {correction.reason}
                </li>
              ))}
            </ul>
          </section>
        )}

        {showForm && (
          <div className="space-y-4">
            <RadioGroup
              value={kind}
              onValueChange={(value) => setKind(value as CorrectionKind)}
              aria-label="Kind of correction"
              className="gap-3"
            >
              {(Object.keys(KIND_TEXT) as CorrectionKind[]).map((option) => (
                <div
                  key={option}
                  className="relative flex items-start gap-3 rounded-lg border p-3 has-data-checked:border-primary has-data-checked:bg-primary/5"
                >
                  {/* Phones: the radio's hit area covers the whole row (44 px or taller) */}
                  <RadioGroupItem
                    value={option}
                    id={`kind-${option}`}
                    className="mt-0.5 after:absolute after:inset-0 after:content-[''] md:after:hidden"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor={`kind-${option}`}>{KIND_TEXT[option].label}</Label>
                    <p className="text-sm text-muted-foreground">{KIND_TEXT[option].help}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {kind === 'ACCEPT_OPTION' && (
              <SelectField
                label="Which answer should also count as correct?"
                value={optionId}
                onValueChange={setOptionId}
                placeholder="Choose an answer"
                options={(options ?? []).map((option) => ({
                  value: String(option.id),
                  label: `${option.labelMarkdown}${option.correct ? ' (already correct)' : ''}`,
                  disabled: option.correct,
                }))}
              />
            )}

            <TextAreaField
              label="Reason"
              value={reason}
              onValueChange={setReason}
              rows={3}
              help="Required. Kept with the correction for the record."
              error={
                reasonTooLong ? `Keep the reason under ${MAX_CORRECTION_REASON} characters.` : null
              }
            />
            <IssueList issues={issues} title="The server would not record that" />
            <ErrorNote message={issues.length === 0 ? failure : null} />
          </div>
        )}

        {recorded && (
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            The correction is recorded. New quizzes and the question report use it from now on.
          </p>
        )}

        {mode === 'rescore' && !rescore && !loadError && (
          <p className="text-sm text-muted-foreground" role="status">
            Re-scoring attempts...
          </p>
        )}
        {rescore && <RescoreResult rescore={rescore} />}

        <DialogFooter stickyFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {showForm ? 'Cancel' : 'Close'}
          </Button>
          {showForm && (
            <Button type="button" disabled={!canSave} onClick={() => void askToConfirm()}>
              {saving ? 'Recording...' : 'Record correction'}
            </Button>
          )}
        </DialogFooter>

        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {kind === 'DROP_QUESTION' ? 'Drop this question?' : 'Accept another answer?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {kind === 'DROP_QUESTION'
                  ? 'From now on this question no longer counts toward anyone\u2019s score, and it is left out of new quizzes. This applies to everyone who has been or will be asked it, and a correction cannot be undone.'
                  : `From now on \u201c${chosenOption ? promptPreview(chosenOption.labelMarkdown, 80) : 'the chosen answer'}\u201d also counts as correct, for everyone who has been or will be asked this question. A correction cannot be undone.`}{' '}
                No one&rsquo;s record, certification or access changes by itself; you will see which
                past attempts would pass or fail differently and decide what to do.
              </AlertDialogDescription>
              <p className="text-sm font-medium" data-testid="correction-effect" aria-live="polite">
                {preview
                  ? describeCorrectionPreview(preview)
                  : previewError
                    ? previewError
                    : 'Working out how many past attempts this changes...'}
              </p>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go back</AlertDialogCancel>
              <AlertDialogAction
                disabled={!preview}
                onClick={(event) => {
                  if (!preview) event.preventDefault();
                  else void save();
                }}
              >
                Record correction
              </AlertDialogAction>
              {previewError && (
                <Button type="button" variant="outline" onClick={() => void askToConfirm()}>
                  Try again
                </Button>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
