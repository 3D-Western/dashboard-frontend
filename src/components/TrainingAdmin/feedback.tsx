'use client';

import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminErrorMessage, issuesFor } from '@/lib/training-admin-errors';
import type { ValidationIssue } from '@/types/training-admin';

/** A list of problems the server found, optionally with the line they are on. */
export function IssueList({
  issues,
  title = 'Fix these first',
  className,
}: {
  issues: ValidationIssue[];
  title?: string;
  className?: string;
}) {
  if (issues.length === 0) return null;
  return (
    <Alert variant="destructive" className={className}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-5">
          {issues.map((issue, index) => (
            <li key={`${issue.path}-${issue.message}-${index}`}>
              {issue.line ? (
                <span className="font-mono text-xs">
                  Line {issue.line}
                  {issue.column ? `:${issue.column}` : ''}{' '}
                </span>
              ) : null}
              {issue.path && <span className="font-medium">{issue.path}: </span>}
              {issue.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/** Things worth a second look that do not stop anything. */
export function WarningList({
  issues,
  title = 'Worth a look (this does not stop you publishing)',
  className,
}: {
  issues: ValidationIssue[];
  title?: string;
  className?: string;
}) {
  if (issues.length === 0) return null;
  return (
    <Alert variant="warning" className={className} role="note">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-5">
          {issues.map((issue, index) => (
            <li key={`${issue.path}-${index}`}>
              {issue.line ? (
                <span className="font-mono text-xs">
                  Line {issue.line}
                  {issue.column ? `:${issue.column}` : ''}{' '}
                </span>
              ) : null}
              {issue.path && <span className="font-medium">{issue.path}: </span>}
              {issue.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/** One sentence about a failed request. */
export function ErrorNote({ message, className }: { message: string | null; className?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className={className} role="alert">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/**
 * What the server said about a save that failed: problems that belong to no form field are listed,
 * and the one-line failure shows only when the server gave no list at all (the fields themselves
 * already show their own problems).
 */
export function ServerProblems({
  issues,
  failure,
  claimedFields,
}: {
  issues: ValidationIssue[];
  failure: string | null;
  claimedFields: string[];
}) {
  const unclaimed = issues.filter(
    (issue) => !claimedFields.some((field) => issuesFor([issue], field).length > 0),
  );
  return (
    <>
      <IssueList issues={unclaimed} title="The server found a problem" />
      <ErrorNote message={issues.length === 0 ? failure : null} />
    </>
  );
}

/**
 * The loading, failed and loaded states of a screen's main request. Children render only once
 * there is data.
 */
export function LoadState({
  isLoading,
  error,
  hasData,
  onRetry,
  what,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  hasData: boolean;
  onRetry: () => void;
  /** Plain words for what failed to load, e.g. "the trainings". */
  what: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label={`Loading ${what}`}>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }
  if (!hasData) {
    return (
      <div className="space-y-3">
        <ErrorNote message={adminErrorMessage(error, `We couldn't load ${what}.`)} />
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  // A refresh that failed leaves the last good data on screen, with a note.
  return (
    <>
      {error ? (
        <div className="mb-4 space-y-2">
          <ErrorNote message={adminErrorMessage(error, `We couldn't refresh ${what}.`)} />
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
      {children}
    </>
  );
}
