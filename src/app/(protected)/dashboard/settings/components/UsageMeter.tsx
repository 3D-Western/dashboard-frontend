import { Badge } from '@/components/ui/badge';
import { JobCategory } from '@/types/jobs';
import { UsagePeriod } from '@/types/usage';
import { CATEGORY_LABELS } from './categoryLabels';

interface UsageMeterProps {
  projectType: JobCategory;
  used: number;
  limit: number; // -1 = unlimited
  period: UsagePeriod;
}

export function UsageMeter({ projectType, used, limit, period }: UsageMeterProps) {
  const label = CATEGORY_LABELS[projectType];
  const isUnlimited = limit === -1;
  const limitReached = !isUnlimited && used >= limit;

  if (isUnlimited) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">{used} used · Unlimited</span>
        </div>
      </div>
    );
  }

  const percentage = Math.min((used / limit) * 100, 100);
  let barColor = 'bg-status-success';
  if (percentage >= 90) {
    barColor = 'bg-status-error';
  } else if (percentage >= 75) {
    barColor = 'bg-status-flagged';
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {used} / {limit} per {period}
          </span>
          {limitReached && (
            <Badge
              className="bg-status-error text-status-error-foreground"
              role="status"
              aria-label={`${label} limit reached`}
            >
              Limit Reached
            </Badge>
          )}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
