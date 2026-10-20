'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminErrorMessage, issuesFromError } from '@/lib/training-admin-errors';
import {
  IN_MATERIAL_TOPIC_SLUG,
  STEP_TYPE_HELP,
  STEP_TYPE_LABELS,
  clock,
} from '@/lib/training-admin-format';
import {
  formFromStep,
  newCheckpointUid,
  toStepBody,
  validateStep,
  type StepFormErrors,
  type StepFormValues,
} from '@/lib/training-step-form';
import type {
  AdminQuestion,
  AdminStep,
  StepType,
  Topic,
  ValidationIssue,
} from '@/types/training-admin';
import { CheckField, TextField } from './fields';
import { ErrorNote, IssueList } from './feedback';
import { BlueprintEditor } from './BlueprintEditor';
import { MarkdownEditor } from './MarkdownEditor';
import { QuestionDialog } from './QuestionDialog';
import { QuestionPicker } from './QuestionPicker';
import { VideoUploader } from './VideoUploader';

type NewQuestionFor = { kind: 'gate' } | { kind: 'checkpoint'; uid: number };

interface StepDialogProps {
  versionId: number;
  trainingId: number;
  /** The step to edit, or null to add one of [type]. */
  step: AdminStep | null;
  type: StepType;
  steps: AdminStep[];
  topics: Topic[];
  questions: AdminQuestion[];
  onClose: () => void;
  /** A question or topic was created from here; the draft editor reloads them. */
  onQuestionsChanged: () => Promise<void> | void;
  onSaved: (step: AdminStep) => Promise<void> | void;
}

/** Adds or edits one step of a draft, with the fields that suit its type. */
export function StepDialog({
  versionId,
  trainingId,
  step,
  type,
  steps,
  topics,
  questions,
  onClose,
  onQuestionsChanged,
  onSaved,
}: StepDialogProps) {
  const [saved, setSaved] = useState<AdminStep | null>(step);
  const [values, setValues] = useState<StepFormValues>(() => formFromStep(step));
  const [errors, setErrors] = useState<StepFormErrors>({ rows: {} });
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newQuestionFor, setNewQuestionFor] = useState<NewQuestionFor | null>(null);
  const [created, setCreated] = useState<AdminQuestion[]>([]);

  const known = new Set(questions.map((q) => q.id));
  const allQuestions = [...questions, ...created.filter((q) => !known.has(q.id))];
  const liveStep = saved ? (steps.find((s) => s.id === saved.id) ?? saved) : null;
  const isNew = saved === null;

  const patch = (changes: Partial<StepFormValues>) => {
    setValues((current) => ({ ...current, ...changes }));
    setErrors({ rows: {} });
  };

  const save = async () => {
    setFailure(null);
    setIssues([]);
    const found = validateStep(type, values);
    if (found) {
      setErrors(found);
      return;
    }
    setErrors({ rows: {} });
    setSaving(true);
    try {
      const body = toStepBody(type, values, liveStep);
      const result = saved
        ? await trainingAdminAPI.updateStep(versionId, saved.id, body)
        : await trainingAdminAPI.addStep(versionId, body);
      await onSaved(result);
      if (type === 'QUIZ' && !saved) {
        // The topics can only be chosen once the step exists, so stay and show them.
        setSaved(result);
        toast.success('Step added. Now choose which topics the quiz draws from.');
      } else {
        toast.success(saved ? 'Step saved.' : 'Step added.');
        onClose();
      }
    } catch (error) {
      setIssues(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't save that step."));
    } finally {
      setSaving(false);
    }
  };

  const issueAt = (path: string) => issues.find((issue) => issue.path === path)?.message;
  const claimed = (path: string | null | undefined) =>
    !!path &&
    (path === 'title' ||
      path === 'bodyMarkdown' ||
      path === 'videoDurationSeconds' ||
      path === 'minWatchPercent' ||
      path === 'gateQuestionVersionId' ||
      path === 'settings.outcomes' ||
      /^settings\.outcomes\[\d+\]$/.test(path) ||
      /^settings\.checkpoints(\[\d+\](\.(atSeconds|questionVersionId))?)?$/.test(path));
  const unmatched = issues.filter((issue) => !claimed(issue.path));
  const outcomeIssue = issues.find((issue) => issue.path?.startsWith('settings.outcomes'))?.message;
  const checkpointIssue = issueAt('settings.checkpoints');

  // Questions asked inside the material are kept in a topic of their own, by convention.
  const inMaterialTopic = topics.find((topic) => topic.slug === IN_MATERIAL_TOPIC_SLUG);

  const onQuestionSaved = async (question: AdminQuestion) => {
    setCreated((current) => [...current, question]);
    if (newQuestionFor?.kind === 'gate') patch({ gate: question.latest.id });
    if (newQuestionFor?.kind === 'checkpoint') {
      const uid = newQuestionFor.uid;
      setValues((current) => ({
        ...current,
        checkpoints: current.checkpoints.map((row) =>
          row.uid === uid ? { ...row, questionVersionId: question.latest.id } : row,
        ),
      }));
    }
    setNewQuestionFor(null);
    await onQuestionsChanged();
  };

  const takenByCheckpoints = values.checkpoints
    .map((row) => row.questionVersionId)
    .filter((id): id is number => id !== null);

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isNew
                ? `Add a ${STEP_TYPE_LABELS[type].toLowerCase()} step`
                : `Edit ${STEP_TYPE_LABELS[type].toLowerCase()} step`}
            </DialogTitle>
            <DialogDescription>{STEP_TYPE_HELP[type]}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <TextField
              label="Title"
              value={values.title}
              onValueChange={(title) => patch({ title })}
              error={[errors.title, issueAt('title')].filter((m): m is string => !!m)}
            />

            {type === 'VIDEO' && (
              <>
                <VideoUploader
                  assetKey={values.assetKey}
                  onUploaded={(assetKey, seconds) =>
                    patch({
                      assetKey,
                      ...(seconds !== null ? { duration: String(seconds) } : {}),
                    })
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Video length (seconds)"
                    value={values.duration}
                    onValueChange={(duration) => patch({ duration })}
                    inputMode="numeric"
                    help={
                      /^\d+$/.test(values.duration) && Number(values.duration) > 0
                        ? `That is ${clock(Number(values.duration))}. Filled in from the file when you upload; videos are 10 minutes or less.`
                        : 'Filled in from the file when you upload. Videos are 10 minutes (600 seconds) or less.'
                    }
                    error={[errors.duration, issueAt('videoDurationSeconds')].filter(
                      (m): m is string => !!m,
                    )}
                  />
                  <TextField
                    label="Minimum watched (%)"
                    value={values.minWatch}
                    onValueChange={(minWatch) => patch({ minWatch })}
                    inputMode="numeric"
                    help="How much of the video must be watched to complete the step. 90 is the usual value."
                    error={[errors.minWatch, issueAt('minWatchPercent')].filter(
                      (m): m is string => !!m,
                    )}
                  />
                </div>

                <section
                  className="space-y-3 rounded-lg border p-3"
                  aria-label="Questions during the video"
                >
                  <div>
                    <h4 className="font-medium">Questions during the video</h4>
                    <p className="text-sm text-muted-foreground">
                      The video pauses at each one. A wrong answer replays the video from the
                      previous question; the right answer is never shown. These questions are never
                      asked again in the final quiz.
                    </p>
                  </div>
                  {values.checkpoints.map((row, index) => (
                    <div key={row.uid} className="space-y-2 rounded-lg bg-muted/40 p-3">
                      <div className="flex flex-wrap items-start gap-2">
                        <div className="w-32">
                          <TextField
                            label={`Question ${index + 1} appears at (seconds)`}
                            value={row.at}
                            inputMode="numeric"
                            onValueChange={(at) =>
                              patch({
                                checkpoints: values.checkpoints.map((r) =>
                                  r.uid === row.uid ? { ...r, at } : r,
                                ),
                              })
                            }
                            error={[
                              errors.rows[row.uid]?.at,
                              issueAt(`settings.checkpoints[${index}].atSeconds`),
                            ].filter((m): m is string => !!m)}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <QuestionPicker
                            label={`Question ${index + 1}`}
                            value={row.questionVersionId}
                            questions={allQuestions}
                            taken={takenByCheckpoints}
                            emptyLabel="Choose a question"
                            onChange={(questionVersionId) =>
                              patch({
                                checkpoints: values.checkpoints.map((r) =>
                                  r.uid === row.uid ? { ...r, questionVersionId } : r,
                                ),
                              })
                            }
                            onNewQuestion={() =>
                              setNewQuestionFor({ kind: 'checkpoint', uid: row.uid })
                            }
                            error={
                              [
                                errors.rows[row.uid]?.question,
                                issueAt(`settings.checkpoints[${index}].questionVersionId`),
                              ]
                                .filter((m): m is string => !!m)
                                .join(' ') || null
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="mt-6"
                          aria-label={`Remove question ${index + 1}`}
                          onClick={() =>
                            patch({
                              checkpoints: values.checkpoints.filter((r) => r.uid !== row.uid),
                            })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(errors.checkpoints || checkpointIssue) && (
                    <p role="alert" className="text-xs text-destructive">
                      {errors.checkpoints ?? checkpointIssue}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      patch({
                        checkpoints: [
                          ...values.checkpoints,
                          { uid: newCheckpointUid(), at: '', questionVersionId: null },
                        ],
                      })
                    }
                  >
                    <Plus /> Add a question
                  </Button>
                </section>

                <TextField
                  label="Outcomes this step can report"
                  value={values.outcomes}
                  onValueChange={(outcomes) => patch({ outcomes })}
                  help="Names for what a member's record can say about this step, separated by commas. Usually just: watched."
                  error={[errors.outcomes, outcomeIssue].filter((m): m is string => !!m)}
                />
              </>
            )}

            {type === 'READING' && (
              <>
                <MarkdownEditor
                  label="Reading text"
                  value={values.body}
                  onValueChange={(body) => patch({ body })}
                  rows={14}
                  help="Markdown: ## headings, **bold**, - lists. The preview is how members will see it."
                  error={issueAt('bodyMarkdown') ?? null}
                />
                <QuestionPicker
                  label="Question after the reading (optional)"
                  value={values.gate}
                  questions={allQuestions}
                  onChange={(gate) => patch({ gate })}
                  help="The member must answer it correctly to finish the section. It is never asked again in the final quiz."
                  error={issueAt('gateQuestionVersionId') ?? null}
                  onNewQuestion={() => setNewQuestionFor({ kind: 'gate' })}
                />
              </>
            )}

            {type === 'ATTESTATION' && (
              <MarkdownEditor
                label="Statement the member agrees to"
                value={values.body}
                onValueChange={(body) => patch({ body })}
                rows={5}
                help="The exact text shown is stored with the member's record."
                error={issueAt('bodyMarkdown') ?? null}
              />
            )}

            {type === 'QUIZ' &&
              (liveStep ? (
                <BlueprintEditor
                  versionId={versionId}
                  step={liveStep}
                  topics={topics}
                  questions={allQuestions}
                  steps={steps}
                  onSaved={(result) => void onSaved(result)}
                />
              ) : (
                <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                  Save the step first. You then choose which topics the quiz draws questions from.
                </p>
              ))}

            <CheckField
              label="Part of an add-on update"
              checked={values.addonScope}
              onCheckedChange={(addonScope) => patch({ addonScope })}
              help="When you publish an add-on update, members who are already certified redo only the steps marked this way."
            />

            <IssueList issues={unmatched} title="The server found a problem" />
            <ErrorNote message={issues.length === 0 ? failure : null} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {saved && !step ? 'Done' : 'Cancel'}
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving...' : isNew ? 'Add step' : 'Save step'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {newQuestionFor && (
        <QuestionDialog
          trainingId={trainingId}
          question={null}
          topics={topics}
          steps={steps.map((s) => ({ position: s.position, title: s.title }))}
          defaultTopicId={inMaterialTopic?.id}
          suggestedTopicName={inMaterialTopic ? undefined : 'In-material'}
          onClose={() => setNewQuestionFor(null)}
          onSaved={onQuestionSaved}
        />
      )}
    </>
  );
}
