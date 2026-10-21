'use client';

import { useCallback, useMemo, useState } from 'react';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminResource } from '@/hooks/useAdminResource';
import { adminErrorMessage } from '@/lib/training-admin-errors';
import { cn } from '@/lib/utils';
import {
  auditActorLabel,
  auditQueryFromFilters,
  type AuditFilters,
  EMPTY_AUDIT_FILTERS,
  formatAuditWhen,
  trainingAuditActionLabels,
} from '@/lib/training-audit';
import type { PaginationMetadata } from '@/types/common';
import type { TrainingAuditAction, TrainingAuditEntry } from '@/types/training-audit';
import { ErrorNote, LoadState } from './feedback';
import { SelectField, TextField } from './fields';

const ACTION_OPTIONS = (Object.keys(trainingAuditActionLabels) as TrainingAuditAction[]).map(
  (action) => ({ value: action, label: trainingAuditActionLabels[action] }),
);

/**
 * /admin/training/audit-log: who changed what in the training editor and in sign-offs, newest first.
 * Filters go to the server; each entry shows its summary and, on request, the before and after values.
 */
export function TrainingAuditLog() {
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);
  // On phones the filters fold away behind a button; from md up they are always shown.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = useMemo(() => auditQueryFromFilters(filters), [filters]);

  const loadTrainings = useCallback(() => trainingAdminAPI.listTrainings(), []);
  const trainings = useAdminResource(loadTrainings);
  const loadFirstPage = useCallback(() => trainingAdminAPI.listAuditLog(query), [query]);
  const firstPage = useAdminResource(loadFirstPage);

  // Older pages are kept with the snapshot time of the first page they extend. A new first page (a new filter, or a
  // reload) has a new snapshot, so pages that belonged to the old list are never appended to it.
  const [older, setOlder] = useState<{
    snapshot: string;
    entries: TrainingAuditEntry[];
    pagination: PaginationMetadata;
  } | null>(null);
  const [olderError, setOlderError] = useState<unknown>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const page = firstPage.data;
  const snapshot = page?.pagination.snapshotCreatedBefore;
  const extra = older && snapshot && older.snapshot === snapshot ? older : null;
  const entries = [...(page?.data ?? []), ...(extra?.entries ?? [])];
  const lastPagination = extra?.pagination ?? page?.pagination;
  const hasOlder = lastPagination?.hasNext ?? false;

  const trainingTitles = new Map((trainings.data ?? []).map((t) => [t.id, t.title]));
  const trainingOptions = (trainings.data ?? [])
    .map((t) => ({ value: String(t.id), label: t.title }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const update = (patch: Partial<AuditFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));
  const filterCount = Object.values(filters).filter((value) => value !== '').length;
  const anyFilter = filterCount > 0;

  const loadOlder = async () => {
    if (!snapshot || !lastPagination) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const next = await trainingAdminAPI.listAuditLog({
        ...query,
        page: lastPagination.page + 1,
        snapshotCreatedBefore: snapshot,
      });
      setOlder({
        snapshot,
        entries: [...(extra?.entries ?? []), ...next.data],
        pagination: next.pagination,
      });
    } catch (err: unknown) {
      setOlderError(err);
    } finally {
      setLoadingOlder(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Audit log</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Who changed what in the training editor and in sign-offs, newest first. Open &ldquo;Show
          details&rdquo; on an entry to see the values before and after the change. Times are in
          your local time.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full md:hidden"
        aria-expanded={filtersOpen}
        aria-controls="audit-filters"
        onClick={() => setFiltersOpen((open) => !open)}
      >
        {filterCount > 0 ? `Filters (${filterCount} set)` : 'Filters'}
      </Button>

      <section
        id="audit-filters"
        aria-label="Filter the audit log"
        className={cn(
          // Five filters need the room beside the sidebar: 3 columns from lg, 5 from xl
          'gap-3 rounded-xl border bg-card p-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
          filtersOpen ? 'grid' : 'hidden',
        )}
      >
        <SelectField
          label="Training"
          value={filters.trainingId}
          onValueChange={(trainingId) => update({ trainingId })}
          placeholder="All trainings"
          options={trainingOptions}
        />
        <SelectField
          label="Change"
          value={filters.action}
          onValueChange={(action) => update({ action })}
          placeholder="All changes"
          options={ACTION_OPTIONS}
        />
        <TextField
          label="Changed by (student number)"
          inputMode="numeric"
          placeholder="Anyone"
          value={filters.actorId}
          onValueChange={(actorId) => update({ actorId })}
        />
        <TextField
          label="From"
          type="date"
          value={filters.from}
          onValueChange={(from) => update({ from })}
        />
        <TextField
          label="To"
          type="date"
          value={filters.to}
          onValueChange={(to) => update({ to })}
        />
        <div className="flex items-end md:col-span-2 lg:col-span-3 lg:justify-end xl:col-span-5">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 fine:min-h-0"
            onClick={() => setFilters(EMPTY_AUDIT_FILTERS)}
            disabled={!anyFilter}
          >
            Clear filters
          </Button>
        </div>
      </section>

      <LoadState
        isLoading={firstPage.isLoading}
        error={firstPage.error}
        hasData={!!page}
        onRetry={() => void firstPage.reload()}
        what="the audit log"
      >
        {entries.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No changes match these filters.
          </p>
        ) : (
          <ol aria-label="Training changes, newest first" className="space-y-3">
            {entries.map((entry) => (
              <AuditRow
                key={entry.id}
                entry={entry}
                trainingTitle={
                  entry.trainingId === null
                    ? null
                    : (trainingTitles.get(entry.trainingId) ?? `Training ${entry.trainingId}`)
                }
              />
            ))}
          </ol>
        )}

        <ErrorNote
          message={
            olderError ? adminErrorMessage(olderError, 'Could not load older changes.') : null
          }
        />
        {hasOlder && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadOlder()}
              disabled={loadingOlder}
            >
              {loadingOlder ? 'Loading…' : 'Load older changes'}
            </Button>
          </div>
        )}
      </LoadState>
    </div>
  );
}

function AuditRow({
  entry,
  trainingTitle,
}: {
  entry: TrainingAuditEntry;
  trainingTitle: string | null;
}) {
  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <time dateTime={entry.createdAt} className="text-sm font-medium">
          {formatAuditWhen(entry.createdAt)}
        </time>
        <span className="text-sm text-muted-foreground">{auditActorLabel(entry)}</span>
      </div>
      <p className="mt-2 break-words">{entry.summary}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{trainingAuditActionLabels[entry.action]}</Badge>
        {trainingTitle && <span>{trainingTitle}</span>}
      </div>
      {entry.details != null && (
        <details className="mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary fine:min-h-0">
            Show details
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs break-words whitespace-pre-wrap">
            {JSON.stringify(entry.details, null, 2)}
          </pre>
        </details>
      )}
    </li>
  );
}
