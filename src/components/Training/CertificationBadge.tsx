import { Badge } from '@/components/ui/badge';
import {
  CERTIFICATION_LABELS,
  CERTIFICATION_TONES,
  type DisplayStatus,
  type StatusTone,
} from '@/lib/training-format';
import { cn } from '@/lib/utils';

const TONE_CLASS: Record<StatusTone, string> = {
  success:
    'border-status-green/40 bg-status-green/15 text-status-green-foreground dark:border-transparent',
  warning:
    'border-status-yellow/40 bg-status-yellow/15 text-status-yellow-foreground dark:border-transparent',
  danger:
    'border-status-red/40 bg-status-red/15 text-status-red-foreground dark:border-transparent',
  info: 'border-status-blue/40 bg-status-blue/15 text-status-blue-foreground dark:border-transparent',
  neutral:
    'border-status-gray/40 bg-status-gray/15 text-status-gray-foreground dark:border-transparent',
};

interface CertificationBadgeProps {
  /** Null means the member has not started this training. */
  status: DisplayStatus | null | undefined;
  className?: string;
}

export function CertificationBadge({ status, className }: CertificationBadgeProps) {
  const label = status ? CERTIFICATION_LABELS[status] : 'Not started';
  const tone = status ? CERTIFICATION_TONES[status] : 'neutral';

  return (
    <Badge className={cn(TONE_CLASS[tone], className)}>
      <span className="sr-only">Status: </span>
      {label}
    </Badge>
  );
}
