import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div
      className="container p-6 space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading print jobs"
    >
      <span className="sr-only">Loading your print jobs, please wait...</span>
      <div className="space-y-2">
        <Skeleton className="h-9 w-32 sm:h-10" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div>
        <Button size={'sm'} disabled>
          New Print
        </Button>
      </div>

      <div className="space-y-4">
        {/* Search bar skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
          <Skeleton className="h-10 w-full sm:max-w-sm" />
          <Skeleton className="h-5 w-40" />
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-md border">
          <div className="w-full">
            {/* Table header */}
            <div className="border-b bg-muted/50">
              <div className="flex">
                <Skeleton className="h-10 w-12 m-2" />
                <Skeleton className="h-10 flex-1 m-2" />
                <Skeleton className="h-10 flex-1 m-2" />
                <Skeleton className="h-10 flex-1 m-2" />
                <Skeleton className="h-10 flex-1 m-2" />
                <Skeleton className="h-10 w-12 m-2" />
              </div>
            </div>

            {/* Table rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-b">
                <div className="flex">
                  <Skeleton className="h-12 w-12 m-2" />
                  <Skeleton className="h-12 flex-1 m-2" />
                  <Skeleton className="h-12 flex-1 m-2" />
                  <Skeleton className="h-12 flex-1 m-2" />
                  <Skeleton className="h-12 flex-1 m-2" />
                  <Skeleton className="h-12 w-12 m-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
