'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DataTablePagination } from '@/components/DataTablePagination';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Routes } from '@/lib/routes';
import { PaginationMetadata } from '@/types/common';
import { JobsView } from '../lib/jobs-view';
import { JobListEntry, JobListItem } from './JobListItem';
import { JobTable } from './JobTable';

// Smallest page size option; below this there's only ever one page, so no pagination controls
const MIN_PAGE_SIZE = 10;

interface JobListProps {
  jobs: JobListEntry[];
  pagination: PaginationMetadata;
  /** A search or status filter is applied, so an empty list means "no matches", not "no jobs" */
  hasFilters: boolean;
  view?: JobsView;
}

export function JobList({ jobs, pagination, hasFilters, view = 'list' }: JobListProps) {
  // The table is for wide screens only: on a phone the cards show whatever view was saved
  const isMobile = useIsMobile();
  const showTable = view === 'table' && !isMobile;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-primary-text/25 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          {hasFilters
            ? 'No jobs match your search or filter.'
            : "Looks like you don't have any jobs yet. Want to get started?"}
        </p>
        <Button asChild variant="outline" size="lg" className="px-4">
          {hasFilters ? (
            <Link href={Routes.jobs.home}>Clear filters</Link>
          ) : (
            <Link href={Routes.jobs.newPrintJob}>Create new job</Link>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showTable ? (
        <JobTable jobs={jobs} />
      ) : (
        <ul className="space-y-3" aria-label="Your jobs">
          {jobs.map((job) => (
            <JobListItem key={job.id} job={job} />
          ))}
        </ul>
      )}
      {(pagination.totalPages > 1 || pagination.totalItems > MIN_PAGE_SIZE) && (
        <DataTablePagination pagination={pagination} />
      )}
    </div>
  );
}
