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

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Prints skeleton */}
          <div className={SECTION_CLASS}>
            <Skeleton className="h-6 w-32" />
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg sm:h-[6.5rem]" />
              ))}
            </div>
          </div>

          {/* Quick actions skeleton */}
          <div className={SECTION_CLASS}>
            <Skeleton className="h-6 w-32" />
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-11 rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        {/* Training skeleton */}
        <div className={SECTION_CLASS}>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-3">
            <Skeleton className="size-14 rounded-lg" />
            <Skeleton className="size-14 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
