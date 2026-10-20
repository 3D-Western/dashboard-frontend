'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/training-format';
import { adminErrorMessage } from '@/lib/training-admin-errors';
import { impactOption } from '@/lib/training-admin-format';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';
import type { VersionSummary } from '@/types/training-admin';
import { TextAreaField, TextField } from './fields';
import { ErrorNote } from './feedback';
import { useTraining } from './TrainingContext';

const STATUS_LABEL: Record<VersionSummary['status'], string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  RETIRED: 'Replaced',
};

/** /admin/training/[id]: the training's details, its versions, and starting or discarding a draft. */
export function TrainingOverview() {
  const { training, reload, setTraining } = useTraining();
  const router = useRouter();
  const [title, setTitle] = useState(training.title);
  const [summary, setSummary] = useState(training.summary ?? '');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = training.versions.find((v) => v.status === 'DRAFT') ?? null;
  const current = training.versions.find((v) => v.status === 'PUBLISHED') ?? null;
  const versions = [...training.versions].sort((a, b) => b.versionNo - a.versionNo);
  const detailsChanged = title.trim() !== training.title || summary !== (training.summary ?? '');

  const saveDetails = async () => {
    setSaving(true);
    setError(null);
    try {
      setTraining(
        await trainingAdminAPI.updateTraining(training.id, { title: title.trim(), summary }),
      );
      toast.success('Details saved.');
    } catch (err) {
      setError(adminErrorMessage(err, "We couldn't save the details."));
    } finally {
      setSaving(false);
    }
  };

  const setArchived = async (archived: boolean) => {
    setBusy(true);
    setError(null);
    try {
      setTraining(await trainingAdminAPI.updateTraining(training.id, { archived }));
    } catch (err) {
      setError(adminErrorMessage(err, "We couldn't change that."));
    } finally {
      setBusy(false);
    }
  };

  const startDraft = async () => {
    setBusy(true);
    setError(null);
    try {
      await trainingAdminAPI.createDraft(training.id);
      await reload();
      router.push(TrainingAdminRoutes.draft(training.id));
    } catch (err) {
      setError(adminErrorMessage(err, "We couldn't start a draft."));
      setBusy(false);
    }
  };

  const discardDraft = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await trainingAdminAPI.discardDraft(draft.id);
      setConfirmDiscard(false);
      toast.success('Draft discarded.');
      await reload();
    } catch (err) {
      setConfirmDiscard(false);
      setError(adminErrorMessage(err, "We couldn't discard the draft."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <UnsavedChangesDialog isDirty={detailsChanged} />
      <ErrorNote message={error} />

      <section className="space-y-3 rounded-xl border bg-card p-4" aria-labelledby="draft-heading">
        <h3 id="draft-heading" className="text-lg font-semibold">
          Editing
        </h3>
        {draft ? (
          <>
            <p className="text-sm text-muted-foreground">
              Draft version {draft.versionNo} is in progress ({draft.stepCount}{' '}
              {draft.stepCount === 1 ? 'step' : 'steps'}). Members still see{' '}
              {current ? `version ${current.versionNo}` : 'nothing'} until you publish it.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={TrainingAdminRoutes.draft(training.id)}>Continue the draft</Link>
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => setConfirmDiscard(true)}
              >
                Discard draft
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {current
                ? `Members see version ${current.versionNo}. Start a draft to change it; it begins as a copy of that version and nothing changes for members until you publish.`
                : 'Nothing is published yet. Start a draft to add the video, reading and quiz.'}
            </p>
            <Button
              type="button"
              disabled={busy || training.archived}
              onClick={() => void startDraft()}
            >
              {current ? 'Start a draft from the published version' : 'Start a draft'}
            </Button>
            {training.archived && (
              <p className="text-xs text-muted-foreground">
                Restore the training to start a draft.
              </p>
            )}
          </>
        )}
      </section>

      <section
        className="space-y-3 rounded-xl border bg-card p-4"
        aria-labelledby="versions-heading"
      >
        <h3 id="versions-heading" className="text-lg font-semibold">
          Versions
        </h3>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {versions.map((version) => (
              <li key={version.id} className="space-y-1 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Version {version.versionNo}</span>
                  <Badge variant={version.status === 'PUBLISHED' ? 'default' : 'outline'}>
                    {STATUS_LABEL[version.status]}
                  </Badge>
                  {version.publishImpact && (
                    <Badge variant="outline">{impactOption(version.publishImpact).label}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {version.stepCount} {version.stepCount === 1 ? 'step' : 'steps'}
                    {version.publishedAt ? ` · ${formatDate(version.publishedAt)}` : ''}
                  </span>
                </div>
                {version.publishReason && (
                  <p className="text-sm text-muted-foreground">Reason: {version.publishReason}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="space-y-4 rounded-xl border bg-card p-4"
        aria-labelledby="details-heading"
      >
        <h3 id="details-heading" className="text-lg font-semibold">
          Details
        </h3>
        <TextField label="Title" value={title} onValueChange={setTitle} />
        <TextAreaField
          label="Summary"
          value={summary}
          onValueChange={setSummary}
          rows={3}
          help="Shown to members on the training list."
        />
        <p className="text-xs text-muted-foreground">
          {training.requiresSignoff
            ? 'Members finish this training with an in-person sign-off by a supervisor.'
            : 'This training is fully online; there is no in-person sign-off.'}{' '}
          Link name: <span className="font-mono">{training.slug}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!detailsChanged || title.trim() === '' || saving}
            onClick={() => void saveDetails()}
          >
            {saving ? 'Saving...' : 'Save details'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void setArchived(!training.archived)}
          >
            {training.archived ? 'Restore this training' : 'Archive this training'}
          </Button>
        </div>
        {!training.archived && (
          <p className="text-xs text-muted-foreground">
            Archiving hides the training from new members and blocks new drafts. Existing records
            are kept.
          </p>
        )}
      </section>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              All unpublished changes in the draft are lost. Published versions are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the draft</AlertDialogCancel>
            <AlertDialogAction onClick={() => void discardDraft()}>Discard draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
