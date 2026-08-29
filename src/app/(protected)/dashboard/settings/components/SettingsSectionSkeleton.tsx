import { Skeleton } from '@/components/ui/skeleton';

interface SettingsSectionSkeletonProps {
  label: string;
  rows?: number;
}

export function SettingsSectionSkeleton({ label, rows = 3 }: SettingsSectionSkeletonProps) {
  return (
    <div className="space-y-2" role="status" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
