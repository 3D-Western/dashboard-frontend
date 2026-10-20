import { Skeleton } from '@/components/ui/skeleton';

export default function TrainingLoading() {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6"
      role="status"
      aria-label="Loading training"
    >
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
