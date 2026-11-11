'use client';

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Routes } from '@/lib/routes';

export interface ActiveJobRef {
  id: string;
  name: string;
}

/**
 * A refused or failed upload gets a screen of its own (not text squeezed into the file strip): what
 * happened, and what to do. Retrying is offered only when it could help.
 */
export function UploadProblem({
  kind,
  message,
  activeJob,
  onRetry,
}: {
  kind: 'job-limit' | 'rate-limit' | 'other';
  message: string;
  activeJob: ActiveJobRef | null;
  onRetry: () => void;
}) {
  const link = (
    <Link
      href={activeJob ? Routes.jobs.detail(activeJob.id) : Routes.jobs.home}
      className="sf-btn sf-btn-sm"
    >
      {activeJob ? `Open ${activeJob.name}` : 'Go to My Jobs'}
    </Link>
  );
  return (
    <div className="sf-block" role="alert" data-testid="upload-problem" data-kind={kind}>
      <TriangleAlert aria-hidden="true" />
      {kind === 'job-limit' ? (
        <>
          <h3>You already have a print in progress</h3>
          <p>
            {activeJob ? `“${activeJob.name}” is still open. ` : ''}
            Only one print can be active at a time. Finish or cancel it, then upload this file
            again.
          </p>
          {link}
        </>
      ) : kind === 'rate-limit' ? (
        <>
          <h3>You&apos;ve reached your print limit for now</h3>
          <p>You can submit again once it resets.</p>
          {link}
        </>
      ) : (
        <>
          <h3>The upload did not finish</h3>
          <p>{message}</p>
          <div className="sf-block-actions">
            <button type="button" className="sf-btn sf-btn-sm" onClick={onRetry}>
              Try again
            </button>
            {/* a full page load on purpose: it starts a clean form */}
            <a href={Routes.jobs.newPrintJob} className="sf-btn sf-btn-ghost sf-btn-sm">
              Choose another file
            </a>
          </div>
        </>
      )}
    </div>
  );
}
