import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div
      className="container space-y-6 p-6"
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard"
    >
      <span className="sr-only">Loading your dashboard, please wait...</span>
      <div className="space-y-2">
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-16" />
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}
