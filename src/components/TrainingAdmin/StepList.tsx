'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
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
import { adminErrorMessage, stepPositionOfIssue } from '@/lib/training-admin-errors';
import { STEP_TYPE_LABELS } from '@/lib/training-admin-format';
import { describeStep } from '@/lib/training-step-form';
import type { AdminStep, ValidationIssue, VersionDetail } from '@/types/training-admin';
import { ErrorNote } from './feedback';

interface StepListProps {
  versionId: number;
  steps: AdminStep[];
  /** Problems from the publish check; those for a step are shown under it. */
  issues: ValidationIssue[];
  /** Warnings from the publish check, shown under their step in amber. */
  warnings?: ValidationIssue[];
  onEdit: (step: AdminStep) => void;
  /** The server returned the whole draft after a reorder. */
  onReordered: (version: VersionDetail) => void;
  /** A step was deleted; the draft needs reloading. */
  onDeleted: () => Promise<void> | void;
}

/** The steps of a draft in order, with move up/down, edit and delete. */
export function StepList({
  versionId,
  steps,
  issues,
  warnings = [],
  onEdit,
  onReordered,
  onDeleted,
}: StepListProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminStep | null>(null);

  const move = async (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= steps.length) return;
    const ids = steps.map((step) => step.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    setError(null);
    try {
      onReordered(await trainingAdminAPI.reorderSteps(versionId, ids));
    } catch (err) {
      setError(adminErrorMessage(err, "We couldn't change the order."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      await trainingAdminAPI.deleteStep(versionId, deleting.id);
      setDeleting(null);
      await onDeleted();
    } catch (err) {
      setDeleting(null);
      setError(adminErrorMessage(err, "We couldn't delete that step."));
    } finally {
      setBusy(false);
    }
  };

  if (steps.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        This draft has no steps yet. Add a video, a reading, a quiz and an attestation below.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ErrorNote message={error} />
      <ol className="space-y-3">
        {steps.map((step, index) => {
          const stepIssues = issues.filter((issue) => stepPositionOfIssue(issue) === step.position);
          const stepWarnings = warnings.filter(
            (issue) => stepPositionOfIssue(issue) === step.position,
          );
          return (
            <li
              key={step.id}
              className="rounded-xl border bg-card p-4"
              aria-label={`Step ${step.position}: ${step.title}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <span className="text-muted-foreground">{step.position}.</span>
                    {step.title}
                    <Badge variant="outline">{STEP_TYPE_LABELS[step.type]}</Badge>
                    {step.addonScope && <Badge variant="secondary">Add-on</Badge>}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{describeStep(step)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-11 sm:size-8"
                    aria-label={`Move step ${step.position} up`}
                    disabled={busy || index === 0}
                    onClick={() => void move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-11 sm:size-8"
                    aria-label={`Move step ${step.position} down`}
                    disabled={busy || index === steps.length - 1}
                    onClick={() => void move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Edit step ${step.position}`}
                    onClick={() => onEdit(step)}
                  >
                    <Pencil /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-11 sm:size-8"
                    aria-label={`Delete step ${step.position}`}
                    disabled={busy}
                    onClick={() => setDeleting(step)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {stepWarnings.length > 0 && (
                <ul
                  aria-label="Warnings"
                  className="mt-3 space-y-1 rounded-lg border border-yellow-600/40 bg-yellow-500/5 p-3 text-sm text-yellow-800 dark:text-yellow-500"
                >
                  {stepWarnings.map((issue) => (
                    <li key={issue.message}>{issue.message}</li>
                  ))}
                </ul>
              )}
              {stepIssues.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {stepIssues.map((issue) => (
                    <li key={issue.message}>{issue.message}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this step?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleting?.title}&rdquo; is removed from this draft and the steps after it move
              up. Published versions are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the step</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Delete step</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
