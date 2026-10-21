'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { FileUp, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { trainingAdminAPI } from '@/api/client/training-admin';
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
import {
  SLUG_HELP,
  SLUG_PATTERN,
  slugify,
  trainingStatusLabels,
} from '@/lib/training-admin-format';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';
import type { AdminTrainingSummary, EquipmentGroup, TrainingKind } from '@/types/training-admin';
import { SelectField, TextAreaField, TextField } from './fields';
import { LoadState, ServerProblems } from './feedback';

/** /admin/training: every training, whether it is published, and a way to start a new one. */
export function TrainingsList() {
  const load = useCallback(() => trainingAdminAPI.listTrainings(), []);
  const { data, error, isLoading, reload } = useAdminResource(load);
  const [creating, setCreating] = useState(false);

  const trainings = [...(data ?? [])].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'ORIENTATION' ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          Members see only the published version. Edit a copy (a draft), then publish it when it is
          ready.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={TrainingAdminRoutes.import}>
              <FileUp /> Import a file
            </Link>
          </Button>
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus /> New training
          </Button>
        </div>
      </div>

      <LoadState
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        onRetry={() => void reload()}
        what="the trainings"
      >
        {trainings.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            There are no trainings yet. Create one, or import a file.
          </p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {trainings.map((training) => (
              <TrainingRow key={training.id} training={training} />
            ))}
          </ul>
        )}
      </LoadState>

      {creating && <CreateTrainingDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function TrainingRow({ training }: { training: AdminTrainingSummary }) {
  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">
            <Link
              href={TrainingAdminRoutes.detail(training.id)}
              className="underline-offset-2 hover:underline"
            >
              {training.title}
            </Link>
          </h2>
          <p className="text-xs text-muted-foreground">
            {training.kind === 'ORIENTATION' ? 'Orientation' : 'Equipment training'} ·{' '}
            <span className="font-mono">{training.slug}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {trainingStatusLabels(training).map((label) => (
            <Badge key={label} variant={label.startsWith('Published') ? 'default' : 'outline'}>
              {label}
            </Badge>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={TrainingAdminRoutes.detail(training.id)}>Open</Link>
        </Button>
        {training.draftVersionId !== null && (
          <Button asChild size="sm" variant="outline">
            <Link href={TrainingAdminRoutes.draft(training.id)}>Continue the draft</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

function CreateTrainingDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const loadGroups = useCallback(() => trainingAdminAPI.listGroups(), []);
  const groups = useAdminResource<EquipmentGroup[]>(loadGroups);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [summary, setSummary] = useState('');
  const [kind, setKind] = useState<TrainingKind>('EQUIPMENT');
  const [groupId, setGroupId] = useState('');
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<ReturnType<typeof issuesFromError>>([]);
  const [failure, setFailure] = useState<string | null>(null);

  const slugError = slug && !SLUG_PATTERN.test(slug) ? SLUG_HELP : null;
  const needsGroup = kind === 'EQUIPMENT';
  const canSave =
    title.trim() !== '' && slug !== '' && !slugError && (!needsGroup || groupId !== '') && !saving;

  const save = async () => {
    setSaving(true);
    setFailure(null);
    setProblems([]);
    try {
      const created = await trainingAdminAPI.createTraining({
        slug,
        title: title.trim(),
        summary: summary.trim() || null,
        kind,
        equipmentGroupId: needsGroup ? Number(groupId) : null,
      });
      toast.success('Training created.');
      router.push(TrainingAdminRoutes.detail(created.id));
    } catch (error) {
      setProblems(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't create that training."));
      setSaving(false);
    }
  };

  const activeGroups = (groups.data ?? []).filter((g) => g.active);

  const { requestClose, guard } = useGuardedClose({ title, slug, summary, kind, groupId }, onClose);

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New training</DialogTitle>
          <DialogDescription>
            This creates the training itself. You add its video, reading and quiz in a draft next.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TextField
            label="Title"
            value={title}
            onValueChange={(value) => {
              setTitle(value);
              if (!slugTouched) setSlug(slugify(value));
            }}
            error={issuesFor(problems, 'title').map((p) => p.message)}
          />
          <TextField
            label="Short name for links (slug)"
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
          <SelectField
            label="Kind"
            value={kind}
            onValueChange={(value) => setKind(value as TrainingKind)}
            options={[
              { value: 'EQUIPMENT', label: 'Equipment training (needs an in-person sign-off)' },
              { value: 'ORIENTATION', label: 'Orientation (fully online)' },
            ]}
            help="The kind cannot be changed later."
          />
          {needsGroup && (
            <SelectField
              label="Equipment group"
              value={groupId}
              onValueChange={setGroupId}
              options={activeGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              placeholder="Choose a group"
              help={
                groups.data && activeGroups.length === 0
                  ? 'There are no active equipment groups. Add one on the Equipment page first.'
                  : undefined
              }
              error={issuesFor(problems, 'equipmentGroupId').map((p) => p.message)}
            />
          )}
          <TextAreaField
            label="Summary (optional)"
            value={summary}
            onValueChange={setSummary}
            rows={3}
            help="Shown to members on the training list."
          />
          <ServerProblems
            issues={problems}
            failure={failure}
            claimedFields={['title', 'slug', 'equipmentGroupId']}
          />
        </div>
        <DialogFooter stickyFooter>
          <Button type="button" variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSave} onClick={() => void save()}>
            {saving ? 'Creating...' : 'Create training'}
          </Button>
        </DialogFooter>
        {guard}
      </DialogContent>
    </Dialog>
  );
}
