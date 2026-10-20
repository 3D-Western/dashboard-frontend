'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { ClipboardCheck, FileText, ListChecks, Plus, Rocket, Video } from 'lucide-react';
import { toast } from 'sonner';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminResource } from '@/hooks/useAdminResource';
import { useTrainingPermissions } from '@/hooks/useTrainingPermissions';
import { adminErrorMessage, stepPositionOfIssue } from '@/lib/training-admin-errors';
import { STEP_TYPE_LABELS } from '@/lib/training-admin-format';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';
import type {
  AdminQuestion,
  AdminStep,
  StepType,
  Topic,
  ValidationIssue,
  VersionDetail,
} from '@/types/training-admin';
import { AuthorOnly } from './AuthorOnly';
import { ChecklistEditor } from './ChecklistEditor';
import { ErrorNote, IssueList, LoadState } from './feedback';
import { PublishDialog } from './PublishDialog';
import { StepDialog } from './StepDialog';
import { StepList } from './StepList';
import { useTraining } from './TrainingContext';

interface DraftData {
  version: VersionDetail;
  topics: Topic[];
  questions: AdminQuestion[];
}

const ADD_STEP_BUTTONS: { type: StepType; icon: typeof Video }[] = [
  { type: 'VIDEO', icon: Video },
  { type: 'READING', icon: FileText },
  { type: 'QUIZ', icon: ListChecks },
  { type: 'ATTESTATION', icon: ClipboardCheck },
];

/** /admin/training/[id]/draft: the steps, quiz topics and checklist of the draft, and publishing. */
export function DraftEditor() {
  const { training, reload } = useTraining();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draft = training.versions.find((v) => v.status === 'DRAFT') ?? null;

  const startDraft = async () => {
    setBusy(true);
    setError(null);
    try {
      await trainingAdminAPI.createDraft(training.id);
      await reload();
    } catch (err) {
      setError(adminErrorMessage(err, "We couldn't start a draft."));
    } finally {
      setBusy(false);
    }
  };

  if (!draft) {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <ErrorNote message={error} />
        <p className="text-sm text-muted-foreground">
          There is no draft of this training. Start one to change the steps, then publish it.{' '}
          <Link href={TrainingAdminRoutes.detail(training.id)} className="underline">
            See the versions
          </Link>
          .
        </p>
        <Button
          type="button"
          disabled={busy || training.archived}
          onClick={() => void startDraft()}
        >
          Start a draft
        </Button>
      </div>
    );
  }

  return (
    <DraftEditorBody
      key={draft.id}
      draftId={draft.id}
      onPublishedClosed={async () => {
        await reload();
        router.push(TrainingAdminRoutes.detail(training.id));
      }}
    />
  );
}

function DraftEditorBody({
  draftId,
  onPublishedClosed,
}: {
  draftId: number;
  onPublishedClosed: () => Promise<void>;
}) {
  const { training } = useTraining();
  const { canPublish } = useTrainingPermissions();
  const load = useCallback(async (): Promise<DraftData> => {
    const [version, topics, questions] = await Promise.all([
      trainingAdminAPI.getVersion(draftId),
      trainingAdminAPI.listTopics(training.id),
      trainingAdminAPI.listQuestions(training.id),
    ]);
    return { version, topics, questions };
  }, [draftId, training.id]);
  const { data, error, isLoading, reload, setData } = useAdminResource(load);

  const [editing, setEditing] = useState<{ step: AdminStep | null; type: StepType } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [checking, setChecking] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const runCheck = async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const result = await trainingAdminAPI.publishCheck(draftId, 'MINOR');
      setIssues(result.issues);
      setChecked(result.ready);
      if (result.ready) toast.success('The draft is ready to publish.');
    } catch (err) {
      setCheckError(adminErrorMessage(err, "We couldn't check the draft."));
    } finally {
      setChecking(false);
    }
  };

  return (
    <LoadState
      isLoading={isLoading}
      error={error}
      hasData={!!data}
      onRetry={() => void reload()}
      what="the draft"
    >
      {data && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">
                Draft version {data.version.version.versionNo}
              </h3>
              <Badge variant="outline">Not visible to members</Badge>
            </div>
            {canPublish ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={checking}
                  onClick={() => void runCheck()}
                >
                  {checking ? 'Checking...' : 'Check before publishing'}
                </Button>
                <Button type="button" onClick={() => setPublishing(true)}>
                  <Rocket /> Publish...
                </Button>
              </div>
            ) : (
              <p className="max-w-xs text-sm text-muted-foreground">
                Publishing needs the &ldquo;publish trainings&rdquo; permission.
              </p>
            )}
          </div>

          <ErrorNote message={checkError} />
          {checked === true && (
            <p className="text-sm text-green-700 dark:text-green-400">
              The last check found nothing missing.
            </p>
          )}
          <IssueList
            issues={issues.filter((issue) => stepPositionOfIssue(issue) === null)}
            title="Not ready to publish"
          />

          <AuthorOnly>
            <StepList
              versionId={draftId}
              steps={data.version.steps}
              issues={issues}
              onEdit={(step) => setEditing({ step, type: step.type })}
              onReordered={(version) => setData({ ...data, version })}
              onDeleted={reload}
            />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Add a step</h3>
              <div className="flex flex-wrap gap-2">
                {ADD_STEP_BUTTONS.map(({ type, icon: Icon }) => (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    onClick={() => setEditing({ step: null, type })}
                  >
                    <Plus /> <Icon /> {STEP_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </div>

            {training.requiresSignoff && (
              <ChecklistEditor
                key={data.version.signoffChecklist.map((i) => i.key).join('|')}
                versionId={draftId}
                items={data.version.signoffChecklist}
                onSaved={(signoffChecklist) =>
                  setData({ ...data, version: { ...data.version, signoffChecklist } })
                }
              />
            )}
          </AuthorOnly>

          {editing && (
            <StepDialog
              key={editing.step?.id ?? `new-${editing.type}`}
              versionId={draftId}
              trainingId={training.id}
              step={editing.step}
              type={editing.type}
              steps={data.version.steps}
              topics={data.topics}
              questions={data.questions}
              onClose={() => setEditing(null)}
              onQuestionsChanged={reload}
              onSaved={async () => {
                await reload();
              }}
            />
          )}

          {publishing && (
            <PublishDialog
              versionId={draftId}
              hasPublished={training.currentVersionId !== null}
              onPublished={() => setPublished(true)}
              onClose={() => {
                setPublishing(false);
                if (published) void onPublishedClosed();
              }}
            />
          )}
        </div>
      )}
    </LoadState>
  );
}
