import { cva } from 'class-variance-authority';
import { Badge } from '@/components/ui/badge';
import { TrainingLevel } from '@/types/training';
import { cn } from '@/lib/utils';

const trainingLevelBadgeVariants = cva('border-transparent', {
  variants: {
    level: {
      LEVEL_1: 'bg-status-draft text-status-draft-foreground',
      LEVEL_2: 'bg-status-success text-status-success-foreground',
    },
  },
});

const LEVEL_LABELS: Record<TrainingLevel, string> = {
  LEVEL_1: 'Level 1',
  LEVEL_2: 'Level 2',
};

interface TrainingLevelBadgeProps {
  level: TrainingLevel;
}

export function TrainingLevelBadge({ level }: TrainingLevelBadgeProps) {
  const label = LEVEL_LABELS[level];

  return (
    <Badge
      className={cn(trainingLevelBadgeVariants({ level }))}
      role="status"
      aria-label={`Training level: ${label}`}
    >
      {label}
    </Badge>
  );
}
