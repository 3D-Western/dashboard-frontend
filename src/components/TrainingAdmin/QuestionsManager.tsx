'use client';

import { useCallback, useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { Badge } from '@/components/ui/badge';
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
import { useAdminResource } from '@/hooks/useAdminResource';
import { adminErrorMessage, issuesFor, issuesFromError } from '@/lib/training-admin-errors';
import { SLUG_HELP, SLUG_PATTERN, promptPreview, slugify } from '@/lib/training-admin-format';
import { QUESTION_TYPE_LABELS } from '@/lib/training-question-form';
import type { AdminQuestion, AdminQuestionType, Topic } from '@/types/training-admin';
import { CheckField, SelectField, TextField } from './fields';
import { ErrorNote, LoadState, ServerProblems } from './feedback';
import { QuestionDialog } from './QuestionDialog';
import { useTraining } from './TrainingContext';

interface QuestionsData {
  topics: Topic[];
  questions: AdminQuestion[];
  steps: { position: number; title: string }[];
}

/** /admin/training/[id]/questions: topics and the questions in them. */
export function QuestionsManager() {
  const { training } = useTraining();
  const load = useCallback(async (): Promise<QuestionsData> => {
    const versionId =
      training.versions.find((v) => v.status === 'DRAFT')?.id ?? training.currentVersionId;
    const [topics, questions, version] = await Promise.all([
      trainingAdminAPI.listTopics(training.id),
      trainingAdminAPI.listQuestions(training.id),
      versionId ? trainingAdminAPI.getVersion(versionId) : Promise.resolve(null),
    ]);
    return {
      topics,
      questions,
      steps: (version?.steps ?? []).map((s) => ({ position: s.position, title: s.title })),
    };
  }, [training.id, training.versions, training.currentVersionId]);
  const { data, error, isLoading, reload } = useAdminResource(load);

  const [topicFilter, setTopicFilter] = useState('');
  const [showRetired, setShowRetired] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | 'new' | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | 'new' | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<AdminQuestion | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const questions = (data?.questions ?? []).filter(
    (q) => (showRetired || q.active) && (topicFilter === '' || String(q.topicId) === topicFilter),
  );

  const deleteQuestion = async () => {
    if (!deletingQuestion) return;
    setActionError(null);
    try {
      const result = await trainingAdminAPI.deleteQuestion(deletingQuestion.id);
      toast.success(
        result.retired
          ? 'That question was already used, so it was retired instead of deleted.'
          : 'Question deleted.',
      );
      setDeletingQuestion(null);
      await reload();
    } catch (err) {
      setDeletingQuestion(null);
      setActionError(adminErrorMessage(err, "We couldn't delete that question."));
    }
  };

  const restoreQuestion = async (question: AdminQuestion) => {
    setActionError(null);
    try {
      await trainingAdminAPI.restoreQuestion(question.id);
      await reload();
    } catch (err) {
      setActionError(adminErrorMessage(err, "We couldn't restore that question."));
    }
  };

  const deleteTopic = async () => {
    if (!deletingTopic) return;
    setActionError(null);
    try {
      await trainingAdminAPI.deleteTopic(deletingTopic.id);
      setDeletingTopic(null);
      if (topicFilter === String(deletingTopic.id)) setTopicFilter('');
      await reload();
    } catch (err) {
      setDeletingTopic(null);
      setActionError(adminErrorMessage(err, "We couldn't delete that topic."));
    }
  };

  return (
    <div className="space-y-5">
      <p className="max-w-prose text-sm text-muted-foreground">
        The question bank. The quiz draws from it by topic; questions can also be asked during a
        video or after a reading. Editing a question that members have already seen creates a new
        version, so past attempts keep the wording they saw.
      </p>
      <ErrorNote message={actionError} />

      <LoadState
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        onRetry={() => void reload()}
        what="the questions"
      >
        {data && (
          <div className="space-y-6">
            <section
              className="space-y-3 rounded-xl border bg-card p-4"
              aria-labelledby="topics-heading"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="topics-heading" className="text-lg font-semibold">
                  Topics
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingTopic('new')}
                >
                  <Plus /> Add a topic
                </Button>
              </div>
              {data.topics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No topics yet. A quiz draws a set number of questions from each topic, so add one
                  first.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {data.topics.map((topic) => (
                    <li
                      key={topic.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{topic.name}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-mono">{topic.slug}</span> · {topic.questionCount}{' '}
                          active {topic.questionCount === 1 ? 'question' : 'questions'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Rename ${topic.name}`}
                          onClick={() => setEditingTopic(topic)}
                        >
                          Rename
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Delete topic ${topic.name}`}
                          onClick={() => setDeletingTopic(topic)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3" aria-labelledby="questions-heading">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h3 id="questions-heading" className="text-lg font-semibold">
                  Questions
                </h3>
                <div className="flex flex-wrap items-end gap-3">
                  <SelectField
                    label="Show topic"
                    value={topicFilter}
                    onValueChange={setTopicFilter}
                    options={data.topics.map((t) => ({ value: String(t.id), label: t.name }))}
                    placeholder="All topics"
                    className="w-48"
                  />
                  <CheckField
                    label="Show retired"
                    checked={showRetired}
                    onCheckedChange={setShowRetired}
                    className="pb-2"
                  />
                  <Button type="button" onClick={() => setEditingQuestion('new')}>
                    <Plus /> Add a question
                  </Button>
                </div>
              </div>

              {questions.length === 0 ? (
                <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                  No questions to show.
                </p>
              ) : (
                <ul className="space-y-3">
                  {questions.map((question) => (
                    <li key={question.id} className="rounded-xl border bg-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline">{question.topicSlug}</Badge>
                            <Badge variant="outline">
                              {QUESTION_TYPE_LABELS[question.latest.type as AdminQuestionType] ??
                                question.latest.type}
                            </Badge>
                            {question.latest.critical && (
                              <Badge variant="destructive">Critical</Badge>
                            )}
                            {question.versionCount > 1 && (
                              <Badge variant="secondary">Version {question.latest.versionNo}</Badge>
                            )}
                            {!question.active && <Badge variant="outline">Retired</Badge>}
                          </div>
                          <p className="text-sm [overflow-wrap:anywhere]">
                            {promptPreview(question.latest.promptMarkdown, 220)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {question.latest.options.length} options
                            {question.latest.remediationStepPosition
                              ? ` · reviews step ${question.latest.remediationStepPosition} after a wrong answer`
                              : ''}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {question.active ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                aria-label={`Edit question: ${promptPreview(question.latest.promptMarkdown, 40)}`}
                                onClick={() => setEditingQuestion(question)}
                              >
                                <Pencil /> Edit
                              </Button>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Delete question: ${promptPreview(question.latest.promptMarkdown, 40)}`}
                                onClick={() => setDeletingQuestion(question)}
                              >
                                <Trash2 />
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void restoreQuestion(question)}
                            >
                              <RotateCcw /> Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </LoadState>

      {data && editingQuestion && (
        <QuestionDialog
          trainingId={training.id}
          question={editingQuestion === 'new' ? null : editingQuestion}
          topics={data.topics}
          steps={data.steps}
          defaultTopicId={topicFilter ? Number(topicFilter) : undefined}
          onClose={() => setEditingQuestion(null)}
          onSaved={async () => {
            setEditingQuestion(null);
            await reload();
          }}
        />
      )}

      {editingTopic && (
        <TopicDialog
          trainingId={training.id}
          topic={editingTopic === 'new' ? null : editingTopic}
          onClose={() => setEditingTopic(null)}
          onSaved={async () => {
            setEditingTopic(null);
            await reload();
          }}
        />
      )}

      <AlertDialog
        open={deletingQuestion !== null}
        onOpenChange={(open) => !open && setDeletingQuestion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              A question nobody has seen is deleted. One that was used in a published version or an
              attempt is retired instead: it stays in old quizzes and in history, but is left out of
              new ones. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the question</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteQuestion()}>
              Delete question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deletingTopic !== null}
        onOpenChange={(open) => !open && setDeletingTopic(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete the topic &ldquo;{deletingTopic?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A topic can only be deleted while it has no questions and no quiz uses it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the topic</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteTopic()}>Delete topic</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TopicDialog({
  trainingId,
  topic,
  onClose,
  onSaved,
}: {
  trainingId: number;
  topic: Topic | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(topic?.name ?? '');
  const [slug, setSlug] = useState(topic?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!topic);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<ReturnType<typeof issuesFromError>>([]);
  const [failure, setFailure] = useState<string | null>(null);

  const slugError = slug && !SLUG_PATTERN.test(slug) ? SLUG_HELP : null;
  const canSave = name.trim() !== '' && slug !== '' && !slugError && !saving;

  const save = async () => {
    setSaving(true);
    setFailure(null);
    setProblems([]);
    try {
      const body = { slug, name: name.trim() };
      if (topic) await trainingAdminAPI.updateTopic(topic.id, body);
      else await trainingAdminAPI.createTopic(trainingId, body);
      await onSaved();
    } catch (error) {
      setProblems(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't save that topic."));
    } finally {
      setSaving(false);
    }
  };

  const { requestClose, guard } = useGuardedClose({ name, slug }, onClose);

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{topic ? 'Rename topic' : 'Add a topic'}</DialogTitle>
          <DialogDescription>
            A topic groups questions, such as Safety or Operation. A quiz draws from each topic.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TextField
            label="Name"
            value={name}
            onValueChange={(value) => {
              setName(value);
              if (!slugTouched) setSlug(slugify(value));
            }}
            error={issuesFor(problems, 'name').map((p) => p.message)}
          />
          <TextField
            label="Short name (slug)"
            value={slug}
            onValueChange={(value) => {
              setSlugTouched(true);
              setSlug(value);
            }}
            help={SLUG_HELP}
            error={[slugError, ...issuesFor(problems, 'slug').map((p) => p.message)].filter(
              (m): m is string => !!m,
            )}
          />
          <ServerProblems issues={problems} failure={failure} claimedFields={['name', 'slug']} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSave} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save topic'}
          </Button>
        </DialogFooter>
        {guard}
      </DialogContent>
    </Dialog>
  );
}
