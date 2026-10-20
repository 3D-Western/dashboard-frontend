import { Badge } from '@/components/ui/badge';
import { CERTIFICATION_LABELS, CERTIFICATION_TONES, type StatusTone } from '@/lib/training-format';
import { cn } from '@/lib/utils';
import type { CertificationStatus } from '@/types/training';

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'bg-status-green/15 text-status-green-foreground',
  warning: 'bg-status-yellow/15 text-status-yellow-foreground',
  danger: 'bg-status-red/15 text-status-red-foreground',
  info: 'bg-status-blue/15 text-status-blue-foreground',
  neutral: 'bg-status-gray/15 text-status-gray-foreground',
};

interface CertificationBadgeProps {
  /** Null means the member has not started this training. */
  status: CertificationStatus | null | undefined;
  className?: string;
}

export function CertificationBadge({ status, className }: CertificationBadgeProps) {
  const label = status ? CERTIFICATION_LABELS[status] : 'Not started';
  const tone = status ? CERTIFICATION_TONES[status] : 'neutral';

  return (
    <Badge className={cn('border-transparent', TONE_CLASS[tone], className)}>
      <span className="sr-only">Status: </span>
      {label}
    </Badge>
  );
}
