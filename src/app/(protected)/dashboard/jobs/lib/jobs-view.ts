// Which layout My Jobs uses: friendly cards, or a compact table for people with lots of jobs.
// Stored in a cookie (not localStorage) so the server renders the right layout on first load.

export type JobsView = 'list' | 'table';

export const JOBS_VIEW_COOKIE = 'jobs-view';

export const parseJobsView = (value: string | undefined): JobsView =>
  value === 'table' ? 'table' : 'list';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Remembers the chosen layout (browser only). */
export function saveJobsView(view: JobsView) {
  document.cookie = `${JOBS_VIEW_COOKIE}=${view}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
