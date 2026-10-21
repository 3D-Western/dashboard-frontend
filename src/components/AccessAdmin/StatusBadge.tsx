import { Badge } from '@/components/ui/badge';
import type { Status } from '@/lib/access-admin-format';
import { cn } from '@/lib/utils';

const TONE_CLASS: Record<Status['tone'], string> = {
  good: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
  warn: 'border-yellow-600/40 bg-yellow-500/10 text-yellow-800 dark:text-yellow-400',
  bad: 'border-destructive/40 bg-destructive/10 text-destructive',
  neutral: 'text-muted-foreground',
};

/** A coloured pill with the status in words (never colour alone). */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={cn(TONE_CLASS[status.tone])}>
      {status.label}
    </Badge>
  );
}
