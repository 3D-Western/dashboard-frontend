'use client';

import { useState } from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGuardedClose } from '@/hooks/useGuardedClose';
import { adminErrorMessage, issuesFor, issuesFromError } from '@/lib/training-admin-errors';
import { slugify } from '@/lib/training-admin-format';
import {
  MAX_OPTIONS,
  QUESTION_TYPE_LABELS,
  emptyForm,
  formFromQuestion,
  newUid,
  optionsForType,
  toQuestionBody,
  validateQuestion,
  type QuestionFormErrors,
  type QuestionFormValues,
} from '@/lib/training-question-form';
import type { AdminQuestion, AdminQuestionType, Topic } from '@/types/training-admin';
import { CheckField, SelectField, TextField } from './fields';
import { ErrorNote, IssueList } from './feedback';
import { MarkdownEditor } from './MarkdownEditor';

const NEW_TOPIC = '__new__';

interface QuestionDialogProps {
  trainingId: number;
  /** The question to edit, or null to add one. */
  question: AdminQuestion | null;
  topics: Topic[];
  /** Steps of the version being edited, for "send them back to this section". */
  steps: { position: number; title: string }[];
  defaultTopicId?: number;
  /** When there is no topic yet, offer to create one with this name. */
  suggestedTopicName?: string;
  onClose: () => void;
  onSaved: (question: AdminQuestion) => void | Promise<void>;
}

/** Adds or edits a question with its options. */
export function QuestionDialog({
  trainingId,
  question,
  topics,
  steps,
  defaultTopicId,
  suggestedTopicName,
  onClose,
  onSaved,
}: QuestionDialogProps) {
  const initialTopic =
    defaultTopicId !== undefined
      ? String(defaultTopicId)
      : topics.length > 0 && !suggestedTopicName
        ? String(topics[0].id)
        : suggestedTopicName
          ? NEW_TOPIC
          : '';
  const [values, setValues] = useState<QuestionFormValues>(() =>
    question ? formFromQuestion(question) : emptyForm(initialTopic),
  );
  const [newTopicName, setNewTopicName] = useState(suggestedTopicName ?? '');
  const [errors, setErrors] = useState<QuestionFormErrors>({});
  const [serverIssues, setServerIssues] = useState<ReturnType<typeof issuesFromError>>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = question !== null;
  const creatingTopic = values.topicId === NEW_TOPIC;

  const patch = (changes: Partial<QuestionFormValues>) => {
    setValues((current) => ({ ...current, ...changes }));
    setErrors({});
  };

  const changeType = (type: AdminQuestionType) =>
    patch({ type, options: optionsForType(type, values.options) });

  const setOption = (uid: number, changes: { label?: string; correct?: boolean }) => {
    patch({
      options: values.options.map((option) => {
        if (option.uid === uid) return { ...option, ...changes };
        // A single-answer question has one correct option: choosing another clears the rest.
        if (changes.correct && values.type !== 'MULTI') return { ...option, correct: false };
        return option;
      }),
    });
  };

  const save = async () => {
    setFailure(null);
    setServerIssues([]);
    const found = validateQuestion(values);
    if (creatingTopic && newTopicName.trim() === '') found.topic = 'Give the new topic a name.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      let topicId = Number(values.topicId);
      if (creatingTopic) {
        const topic = await trainingAdminAPI.createTopic(trainingId, {
          slug: slugify(newTopicName),
          name: newTopicName.trim(),
        });
        topicId = topic.id;
        // If the question then fails, a retry must reuse this topic rather than create it again.
        setValues((current) => ({ ...current, topicId: String(topic.id) }));
      }
      const body = toQuestionBody(values, topicId);
      const saved = question
        ? await trainingAdminAPI.updateQuestion(question.id, body)
        : await trainingAdminAPI.createQuestion(trainingId, body);
      if (question && saved.versionCount > question.versionCount) {
        toast.success(
          `Saved as version ${saved.latest.versionNo}. Earlier versions are kept for past attempts.`,
        );
      } else {
        toast.success(isEdit ? 'Question saved.' : 'Question added.');
      }
      await onSaved(saved);
    } catch (error) {
      setServerIssues(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't save that question."));
    } finally {
      setSaving(false);
    }
  };

  const optionRowsLocked = values.type === 'TRUE_FALSE';
  const unmatched = serverIssues.filter(
    (issue) =>
      !['topicId', 'promptMarkdown', 'options', 'remediationStepPosition'].some(
        (field) => issuesFor([issue], field).length > 0,
      ),
  );

  const { requestClose, guard } = useGuardedClose({ values, newTopicName }, onClose);

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit question' : 'Add a question'}</DialogTitle>
          <DialogDescription>
            Questions can be asked in the quiz, during a video, or after a reading.
          </DialogDescription>
        </DialogHeader>

        {isEdit && (
          <Alert>
            <Info />
            <AlertDescription>
              {question.inUse ? (
                <>
                  Members have been asked this question, or a published version holds it. Saving
                  creates a <strong>new version</strong>: past attempts keep the wording they saw,
                  and steps in the current draft switch to the new version.
                </>
              ) : (
                <>
                  Nobody has been asked this question yet, so saving changes it in place and creates
                  no new version.
                </>
              )}{' '}
              It has {question.versionCount} {question.versionCount === 1 ? 'version' : 'versions'}{' '}
              so far.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <SelectField
            label="Topic"
            value={values.topicId}
            onValueChange={(topicId) => patch({ topicId })}
            options={[
              ...topics.map((topic) => ({ value: String(topic.id), label: topic.name })),
              { value: NEW_TOPIC, label: 'New topic...' },
            ]}
            placeholder="Choose a topic"
            help="The quiz draws a set number of questions from each topic."
            error={[
              errors.topic,
              ...issuesFor(serverIssues, 'topicId').map((p) => p.message),
            ].filter((m): m is string => !!m)}
          />
          {creatingTopic && (
            <TextField
              label="New topic name"
              value={newTopicName}
              onValueChange={setNewTopicName}
              help="Questions asked during a video or reading are usually kept in a topic called In-material."
            />
          )}

          <SelectField
            label="Type"
            value={values.type}
            onValueChange={(value) => changeType(value as AdminQuestionType)}
            options={(Object.keys(QUESTION_TYPE_LABELS) as AdminQuestionType[]).map((type) => ({
              value: type,
              label: QUESTION_TYPE_LABELS[type],
            }))}
          />

          <MarkdownEditor
            label="Question"
            value={values.prompt}
            onValueChange={(prompt) => patch({ prompt })}
            rows={4}
            error={errors.prompt ?? issuesFor(serverIssues, 'promptMarkdown')[0]?.message ?? null}
          />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {values.type === 'MULTI'
                ? 'Options (tick every correct one)'
                : 'Options (mark the correct one)'}
            </legend>
            <ul className="space-y-2">
              {values.options.map((option, index) => (
                <li key={option.uid} className="flex items-center gap-2">
                  <input
                    type={values.type === 'MULTI' ? 'checkbox' : 'radio'}
                    name="correct-option"
                    checked={option.correct}
                    onChange={(event) => setOption(option.uid, { correct: event.target.checked })}
                    aria-label={`Option ${index + 1} is correct`}
                    className="size-5 shrink-0 accent-[var(--color-primary)]"
                  />
                  <input
                    type="text"
                    value={option.label}
                    readOnly={optionRowsLocked}
                    onChange={(event) => setOption(option.uid, { label: event.target.value })}
                    aria-label={`Option ${index + 1} text`}
                    placeholder={`Option ${index + 1}`}
                    className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none read-only:opacity-70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:text-sm"
                  />
                  {!optionRowsLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove option ${index + 1}`}
                      disabled={values.options.length <= 2}
                      onClick={() =>
                        patch({ options: values.options.filter((o) => o.uid !== option.uid) })
                      }
                    >
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {!optionRowsLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={values.options.length >= MAX_OPTIONS}
                onClick={() =>
                  patch({
                    options: [...values.options, { uid: newUid(), label: '', correct: false }],
                  })
                }
              >
                <Plus /> Add an option
              </Button>
            )}
            {(errors.options || issuesFor(serverIssues, 'options').length > 0) && (
              <p role="alert" className="text-xs text-destructive">
                {errors.options ?? issuesFor(serverIssues, 'options')[0].message}
              </p>
            )}
          </fieldset>

          <CheckField
            label="Critical question"
            checked={values.critical}
            onCheckedChange={(critical) => patch({ critical })}
            help="Must be answered correctly to pass, whatever the score. Use for emergency stops, protective equipment and fire."
          />

          <SelectField
            label="After a wrong answer, send the member back to"
            value={values.remediation}
            onValueChange={(remediation) => patch({ remediation })}
            options={steps.map((step) => ({
              value: String(step.position),
              label: `Step ${step.position}: ${step.title}`,
            }))}
            placeholder="No particular step"
            help="The answer is never shown. Members are pointed at this section to review instead."
            error={
              errors.remediation ??
              issuesFor(serverIssues, 'remediationStepPosition')[0]?.message ??
              null
            }
          />

          <MarkdownEditor
            label="Explanation (optional, for staff)"
            value={values.explanation}
            onValueChange={(explanation) => patch({ explanation })}
            rows={3}
            help="Why the right answer is right. Kept with the question; members do not see it."
          />

          <IssueList issues={unmatched} title="The server found a problem" />
          <ErrorNote message={serverIssues.length === 0 ? failure : null} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving...' : isEdit ? 'Save question' : 'Add question'}
          </Button>
        </DialogFooter>
        {guard}
      </DialogContent>
    </Dialog>
  );
}
