'use client';

import Link from 'next/link';
import { Clock, Hourglass, ShieldCheck } from 'lucide-react';
import { blockedMessage } from '@/api/client/training-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { daysUntil, displayStatus, formatDate, isNotPassed } from '@/lib/training-format';
import { Routes } from '@/lib/routes';
import type { SignoffFeedback, TrainingSummary } from '@/types/training';
import { CertificationBadge } from './CertificationBadge';

interface TrainingCardProps {
  training: TrainingSummary;
  starting: boolean;
  errorMessage?: string | null;
  onStart: (slug: string) => void;
  /** Overridable for tests. */
  now?: Date;
}

/** One training: where I stand, and the single next thing to do about it. */
export function TrainingCard({
  training,
  starting,
  errorMessage,
  onStart,
  now = new Date(),
}: TrainingCardProps) {
  const cooldownOver =
    training.nextAction === 'BLOCKED' &&
    training.blockedReason === 'RETRY_COOLDOWN' &&
    !!training.retryAt &&
    new Date(training.retryAt).getTime() <= now.getTime();

  const startLabel: Record<string, string> = {
    START: isNotPassed(training) ? 'Try again' : 'Start training',
    START_ADDON: 'Complete the new material',
    START_REFRESHER: 'Start refresher',
  };

  return (
    <article
      aria-labelledby={`training-${training.slug}`}
      className="space-y-4 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h2 id={`training-${training.slug}`} className="text-lg">
            {training.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {training.kind === 'ORIENTATION' ? 'Orientation' : 'Equipment training'} ·{' '}
            {training.stepCount} {training.stepCount === 1 ? 'step' : 'steps'}
          </p>
        </div>
        <CertificationBadge status={displayStatus(training)} />
      </div>

      {training.summary && <p className="text-sm">{training.summary}</p>}

      <CertificationDetails training={training} now={now} />

      {training.signoffFeedback && <SignoffFeedbackNote feedback={training.signoffFeedback} />}

      {isNotPassed(training) && (
        <p className="text-sm font-medium text-status-yellow-foreground">
          You haven&apos;t passed this training yet.
        </p>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <NextAction
        training={training}
        starting={starting}
        cooldownOver={cooldownOver}
        startLabel={startLabel}
        onStart={onStart}
        now={now}
      />
    </article>
  );
}

function CertificationDetails({ training, now }: { training: TrainingSummary; now: Date }) {
  const { certification } = training;
  if (!certification) return null;

  const lines: React.ReactNode[] = [];
  if (certification.status === 'ACTIVE' || certification.status === 'REFRESHER_DUE') {
    if (certification.activeSince) {
      lines.push(
        <li key="since" className="flex items-center gap-2">
          <ShieldCheck className="size-4 shrink-0 text-status-green" aria-hidden="true" />
          Certified since {formatDate(certification.activeSince)}
        </li>,
      );
    }
    if (certification.expiresAt) {
      const days = daysUntil(certification.expiresAt, now);
      lines.push(
        <li key="expires" className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {days < 0
            ? `Expired on ${formatDate(certification.expiresAt)}`
            : days <= 30
              ? `Expires in ${days} ${days === 1 ? 'day' : 'days'} (${formatDate(certification.expiresAt)})`
              : `Valid until ${formatDate(certification.expiresAt)}`}
        </li>,
      );
    }
  }
  if (certification.addonRequired && certification.addonDueAt) {
    lines.push(
      <li key="addon" className="flex items-center gap-2 font-medium text-status-yellow-foreground">
        <Hourglass className="size-4 shrink-0" aria-hidden="true" />
        New material to complete by {formatDate(certification.addonDueAt)}
      </li>,
    );
  }
  return lines.length > 0 ? <ul className="space-y-1.5 text-sm">{lines}</ul> : null;
}

/** A supervisor wasn't satisfied in person: say why, and what happens next. */
function SignoffFeedbackNote({ feedback }: { feedback: SignoffFeedback }) {
  return (
    <Alert>
      <AlertDescription className="space-y-1">
        <p className="font-medium">
          {feedback.mustRedoOnline
            ? 'A supervisor asked you to redo the online training'
            : 'A supervisor was not ready to sign you off yet'}
        </p>
        <p>{feedback.reason}</p>
        <p className="text-muted-foreground">
          {feedback.mustRedoOnline
            ? 'Retake the training, then ask for a sign-off again.'
            : 'Practise, then find a supervisor for another in-person check. You do not need to retake the online part.'}
        </p>
      </AlertDescription>
    </Alert>
  );
}

function NextAction({
  training,
  starting,
  cooldownOver,
  startLabel,
  onStart,
  now,
}: {
  training: TrainingSummary;
  starting: boolean;
  cooldownOver: boolean;
  startLabel: Record<string, string>;
  onStart: (slug: string) => void;
  now: Date;
}) {
  switch (training.nextAction) {
    case 'RESUME':
      return training.inProgressAttemptId ? (
        <Button asChild className="w-full sm:w-auto">
          <Link href={Routes.training.attempt(training.inProgressAttemptId)}>
            Continue where you left off
          </Link>
        </Button>
      ) : null;
    case 'START':
    case 'START_ADDON':
    case 'START_REFRESHER':
      return (
        <Button
          type="button"
          onClick={() => onStart(training.slug)}
          disabled={starting}
          className="w-full sm:w-auto"
        >
          {starting ? 'Starting...' : startLabel[training.nextAction]}
        </Button>
      );
    case 'AWAITING_SIGNOFF':
      return (
        <p className="text-sm text-muted-foreground">
          You&apos;ve passed the online part. Find a supervisor at the makerspace to sign you off in
          person.
        </p>
      );
    case 'BLOCKED':
      return cooldownOver ? (
        <Button
          type="button"
          onClick={() => onStart(training.slug)}
          disabled={starting}
          className="w-full sm:w-auto"
        >
          {starting ? 'Starting...' : 'Try again'}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">{blockedMessage(training, now)}</p>
      );
    case 'NONE':
    default:
      return (
        <p className="text-sm text-muted-foreground">
          You&apos;re all set. Nothing more to do here.
        </p>
      );
  }
}
