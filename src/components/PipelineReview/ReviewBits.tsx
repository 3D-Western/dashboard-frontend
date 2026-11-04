import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { staffStatusLabel, statusTone, type StatusTone } from '@/lib/pipeline-review';
import type { StaffStatus } from '@/types/pipeline-review';

const TONE_CLASS: Record<StatusTone, string> = {
  danger: 'bg-status-red text-status-red-foreground',
  warning: 'bg-status-yellow text-status-yellow-foreground',
  success: 'bg-status-green text-status-green-foreground',
  neutral: 'bg-status-gray text-status-gray-foreground',
};

/** A staff status in plain words, coloured by how urgent it is. */
export function StaffStatusBadge({
  status,
  className,
}: {
  status: StaffStatus | null | undefined;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      data-status={status ?? undefined}
      className={cn('border-transparent', TONE_CLASS[statusTone(status)], className)}
    >
      {staffStatusLabel(status)}
    </Badge>
  );
}

/** Explains an API error in one line for staff (the backend's own message when it sent one). */
export function reviewErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && error.message !== 'UNKNOWN_ERROR') {
    return error.message;
  }
  return fallback;
}
