import { Skeleton } from '@/components/ui/skeleton';

const SECTION_CLASS = 'space-y-4 rounded-xl border bg-card p-5 sm:p-6';

export default function DashboardLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6 p-6"
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard"
    >
      <span className="sr-only">Loading your dashboard, please wait...</span>
      <div className="space-y-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>

      {/* Prints skeleton */}
      <div className={SECTION_CLASS}>
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg sm:h-[6.5rem]" />
          ))}
        </div>
      </div>

      {/* Quick actions skeleton — TEMP: hidden with the Quick actions panel, see docs/LAUNCH_SCOPE.md
      <div className={SECTION_CLASS}>
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      </div>
      */}
    </div>
  );
}
