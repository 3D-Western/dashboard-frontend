import { Skeleton } from '@/components/ui/skeleton';

export default function PrintJobsLoading() {
  return (
    <div className="container space-y-6 p-6">
      <div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="rounded-md border">
          <div className="p-4">
            <Skeleton className="mb-4 h-12 w-full" />
            <Skeleton className="mb-4 h-12 w-full" />
            <Skeleton className="mb-4 h-12 w-full" />
            <Skeleton className="mb-4 h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
