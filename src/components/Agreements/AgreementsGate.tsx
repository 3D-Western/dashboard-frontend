'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown } from 'lucide-react';
import { ApiError } from '@/api/client/errors';
import { trainingAPI } from '@/api/client/training';
import { trainingErrorMessage } from '@/api/client/training-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import LogoutButton from '@/components/DashboardHeader/LogoutButton';
import { Markdown } from '@/components/Markdown';
import { formatDate } from '@/lib/training-format';
import { cn } from '@/lib/utils';
import type { Agreement } from '@/types/training';

interface AgreementsGateProps {
  agreements: Agreement[];
}

/**
 * Shown in place of the dashboard while the member has agreements to accept (terms, waiver,
 * and so on). Each one can be read in full and is accepted on its own. Once every one is
 * accepted the page reloads into the dashboard.
 */
export function AgreementsGate({ agreements }: AgreementsGateProps) {
  const router = useRouter();
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const remaining = agreements.filter((a) => !accepted.has(a.agreementId)).length;

  const accept = async (agreement: Agreement) => {
    setBusyId(agreement.agreementId);
    setErrors((prev) => ({ ...prev, [agreement.agreementId]: '' }));
    try {
      await trainingAPI.acceptAgreement(agreement.agreementId);
      setAccepted((prev) => new Set(prev).add(agreement.agreementId));
    } catch (error) {
      setErrors((prev) => ({ ...prev, [agreement.agreementId]: trainingErrorMessage(error) }));
      if (error instanceof ApiError && error.code === 'AGREEMENT_SUPERSEDED') {
        // A newer version was published: reload to read the current one.
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="mx-auto min-h-svh w-full max-w-2xl space-y-6 px-4 py-8 sm:py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Before you continue</h1>
        <p className="text-muted-foreground">
          Please read and accept{' '}
          {agreements.length === 1 ? 'this agreement' : 'each of these agreements'} to use the
          makerspace dashboard. You can open each one to read it in full.
        </p>
      </header>

      <ul className="space-y-4">
        {agreements.map((agreement) => (
          <AgreementItem
            key={agreement.agreementId}
            agreement={agreement}
            accepted={accepted.has(agreement.agreementId)}
            busy={busyId === agreement.agreementId}
            error={errors[agreement.agreementId] || null}
            onAccept={() => void accept(agreement)}
          />
        ))}
      </ul>

      <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {remaining === 0
            ? 'All done. Thank you.'
            : `${remaining} ${remaining === 1 ? 'agreement' : 'agreements'} left to accept.`}
        </p>
        {/* Stacked on phones (a full-width Continue beside Logout overflowed 390 px), a row from sm up */}
        <div
          data-testid="agreements-actions"
          className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center [&>button]:w-full sm:[&>button]:w-auto"
        >
          {remaining > 0 && <LogoutButton />}
          <Button
            type="button"
            onClick={() => router.refresh()}
            disabled={remaining > 0}
            className="w-full sm:w-auto"
          >
            Continue to the dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}

function AgreementItem({
  agreement,
  accepted,
  busy,
  error,
  onAccept,
}: {
  agreement: Agreement;
  accepted: boolean;
  busy: boolean;
  error: string | null;
  onAccept: () => void;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <li className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-lg">{agreement.title}</h2>
          <p className="text-sm text-muted-foreground fine:text-xs">
            Version {agreement.versionNo}
            {agreement.publishedAt ? ` · ${formatDate(agreement.publishedAt)}` : ''}
          </p>
        </div>
        {accepted && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-status-green/15 px-2.5 py-1 text-xs font-medium text-status-green-foreground">
            <Check className="size-3" aria-hidden="true" />
            Accepted
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm font-medium"
      >
        {open ? 'Hide the full text' : 'Read the full text'}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 transition-transform motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      <div
        id={bodyId}
        hidden={!open}
        // Tabbable so keyboard users can scroll the text
        tabIndex={open ? 0 : undefined}
        className="max-h-[60svh] overflow-y-auto rounded-lg border bg-background p-4 text-sm"
      >
        <Markdown>{agreement.bodyMarkdown}</Markdown>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!accepted && (
        <Button type="button" onClick={onAccept} disabled={busy} className="w-full sm:w-auto">
          {busy ? 'Saving...' : `I accept the ${agreement.title}`}
        </Button>
      )}
    </li>
  );
}
