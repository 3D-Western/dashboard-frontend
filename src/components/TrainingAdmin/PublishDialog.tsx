'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { adminErrorMessage, issuesFromError } from '@/lib/training-admin-errors';
import {
  IMPACT_OPTIONS,
  describeEffects,
  describeImpactNow,
  impactOption,
} from '@/lib/training-admin-format';
import { formatDate } from '@/lib/training-format';
import type {
  PublishCheck,
  PublishImpact,
  PublishResult,
  ValidationIssue,
} from '@/types/training-admin';
import { CheckField, TextAreaField } from './fields';
import { ErrorNote, IssueList, WarningList } from './feedback';

export const MAX_REASON_LENGTH = 2000;

interface PublishDialogProps {
  versionId: number;
  /** Is a version already published? If not, nobody is certified and only a minor publish makes sense. */
  hasPublished: boolean;
  onClose: () => void;
  /** Called once, when the version is live. */
  onPublished: (result: PublishResult, impact: PublishImpact) => void;
}

/**
 * Publishing: how the change affects people who are already certified, why, and what the server
 * says is still missing. The check re-runs when the impact changes because an add-on update has an
 * extra rule (something must be marked as part of the add-on).
 */
export function PublishDialog({
  versionId,
  hasPublished,
  onClose,
  onPublished,
}: PublishDialogProps) {
  const [impact, setImpact] = useState<PublishImpact>('MINOR');
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [check, setCheck] = useState<PublishCheck | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [serverIssues, setServerIssues] = useState<ValidationIssue[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [recheck, setRecheck] = useState(0);

  useEffect(() => {
    let current = true;
    const run = async () => {
      try {
        const response = await trainingAdminAPI.publishCheck(versionId, impact);
        if (!current) return;
        setCheck(response);
        setCheckError(null);
      } catch (error) {
        if (!current) return;
        setCheck(null);
        setCheckError(adminErrorMessage(error, "We couldn't check the draft."));
      }
    };
    void run();
    return () => {
      current = false;
    };
  }, [versionId, impact, recheck]);

  const chooseImpact = (value: PublishImpact) => {
    setImpact(value);
    setCheck(null);
    setCheckError(null);
    setAcknowledged(false);
    setServerIssues([]);
    setFailure(null);
  };

  const reasonTooLong = reason.length > MAX_REASON_LENGTH;
  const needsConfirm = impact !== 'MINOR';
  const canPublish =
    !!check?.ready &&
    reason.trim() !== '' &&
    !reasonTooLong &&
    (!needsConfirm || acknowledged) &&
    !publishing;

  const publish = async () => {
    setPublishing(true);
    setFailure(null);
    setServerIssues([]);
    try {
      const response = await trainingAdminAPI.publish(versionId, { impact, reason: reason.trim() });
      setResult(response);
      onPublished(response, impact);
    } catch (error) {
      setServerIssues(issuesFromError(error));
      setFailure(adminErrorMessage(error, "We couldn't publish this version."));
    } finally {
      setPublishing(false);
    }
  };

  if (result) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600" /> Version {result.version.versionNo}{' '}
              is live
            </DialogTitle>
            <DialogDescription>
              {describeEffects(impact, result.effects, formatDate)}
            </DialogDescription>
          </DialogHeader>
          <WarningList issues={result.warnings} />
          <p className="text-sm text-muted-foreground">
            The quiz pool is frozen at {result.poolSize}{' '}
            {result.poolSize === 1 ? 'question' : 'questions'}.
            {result.retiredVersionId !== null ? ' The previous version is now retired.' : ''}
          </p>
          <DialogFooter>
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const selected = impactOption(impact);

  return (
    <Dialog open onOpenChange={(open) => !open && !publishing && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Publish this draft</DialogTitle>
          <DialogDescription>
            Members see the new version straight away. Choose what it means for people who are
            already certified.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={impact}
          onValueChange={(value) => chooseImpact(value as PublishImpact)}
          aria-label="What kind of change is this?"
          className="gap-3"
        >
          {IMPACT_OPTIONS.map((option) => {
            const disabled = !hasPublished && option.value !== 'MINOR';
            const id = `impact-${option.value}`;
            return (
              <label
                key={option.value}
                htmlFor={id}
                className={cn(
                  'flex min-h-11 items-start gap-3 rounded-lg border p-3 has-data-checked:border-primary has-data-checked:bg-primary/5',
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                {/* The whole row is the tap target (a label), not just the 16 px radio */}
                <RadioGroupItem
                  value={option.value}
                  id={id}
                  disabled={disabled}
                  className="mt-0.5"
                />
                <span className="block min-w-0 space-y-0.5">
                  <span className="block text-sm leading-snug font-medium">{option.label}</span>
                  <span className="block text-sm text-muted-foreground">{option.summary}</span>
                  {disabled && (
                    <span className="block text-xs text-muted-foreground">
                      Not available yet: this is the first version, so no one is certified.
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </RadioGroup>

        <div
          className="rounded-lg bg-muted/50 p-3 text-sm"
          aria-live="polite"
          data-testid="impact-effect"
        >
          <p className="font-medium">What this does to people already certified</p>
          <p className="mt-1 text-muted-foreground">{selected.effect}</p>
          {check && (
            <p className="mt-2 font-medium" data-testid="impact-now">
              {describeImpactNow(impact, check.effects, formatDate)}
            </p>
          )}
        </div>

        <div aria-live="polite" className="space-y-2">
          {!check && !checkError && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Checking the draft...
            </p>
          )}
          {check?.ready && (
            <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="size-4" /> The draft is ready to publish.
            </p>
          )}
          {check && !check.ready && (
            <IssueList issues={check.issues} title="Fix these before publishing" />
          )}
          <WarningList issues={check?.warnings ?? []} />
          {checkError && (
            <div className="space-y-2">
              <ErrorNote message={checkError} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCheckError(null);
                  setRecheck((n) => n + 1);
                }}
              >
                Check again
              </Button>
            </div>
          )}
        </div>

        <TextAreaField
          label="Why are you publishing this?"
          value={reason}
          onValueChange={setReason}
          rows={3}
          help="Kept with the version and in the audit log. For example: Added the new fire procedure."
          error={
            reasonTooLong
              ? `Keep the reason under ${MAX_REASON_LENGTH} characters.`
              : (serverIssues.find((issue) => issue.path === 'reason')?.message ?? null)
          }
        />

        {impact === 'ADDON' && (
          <CheckField
            label="I understand that everyone certified will be asked to finish the steps marked as part of the add-on, by a deadline, or lose access."
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
          />
        )}
        {impact === 'FULL_RETAKE' && (
          <CheckField
            label="I understand that everyone certified must take the whole training again."
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
          />
        )}

        <IssueList
          issues={serverIssues.filter((issue) => issue.path !== 'reason')}
          title="The server would not publish"
        />
        <ErrorNote message={serverIssues.length === 0 ? failure : null} />

        <DialogFooter stickyFooter>
          <Button type="button" variant="outline" disabled={publishing} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!canPublish} onClick={() => void publish()}>
            {publishing ? 'Publishing...' : `Publish (${selected.label.toLowerCase()})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
