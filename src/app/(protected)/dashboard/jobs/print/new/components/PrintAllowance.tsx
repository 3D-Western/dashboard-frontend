'use client';

import { Clock, Printer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountLimits, useUsageSummary } from '@/hooks/useUsage';
import { cn } from '@/lib/utils';
import { useUser } from '@/providers/user-provider';
import { calculateRemainingQuota, getPeriodResetDate } from '@/utils/usage-calculators';

/**
 * How many 3D prints the user has left this period, shown before they fill in the form so nobody
 * finds out they're out of prints only after submitting. Shows nothing for unlimited accounts or
 * when the limits can't be loaded (the backend still enforces them on submit).
 */
export function PrintAllowance() {
  const user = useUser();
  return user ? <Allowance userId={String(user.studentId)} /> : null;
}

function Allowance({ userId }: { userId: string }) {
  const { limits, isLoading: limitsLoading, error: limitsError } = useAccountLimits(userId);
  const printLimit = limits.find((limit) => limit.projectType === 'ThreeDPrint');
  const period = printLimit?.period ?? 'month';
  const { entries, isLoading: usageLoading, error: usageError } = useUsageSummary(userId, period);

  if (limitsLoading || usageLoading) {
    return <Skeleton className="h-[3.75rem] rounded-lg" aria-label="Loading your print limit" />;
  }

  if (limitsError || usageError || !printLimit) return null;

  const [quota] = calculateRemainingQuota(entries, [printLimit]);
  if (quota.isUnlimited) return null;

  const isOut = quota.remaining === 0;
  const isLow = quota.remaining === 1;
  const usedShare = quota.limit > 0 ? Math.min(quota.used / quota.limit, 1) : 1;
  const Icon = isOut ? Clock : Printer;
  const resetDate = getPeriodResetDate(period);
  const resetLabel = resetDate?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg px-4 py-3',
        isOut || isLow ? 'bg-status-yellow/10' : 'bg-muted/60',
      )}
    >
      <Icon
        className={cn(
          'size-5 shrink-0',
          isOut || isLow ? 'text-status-yellow-foreground' : 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-sm">
            {isOut
              ? `You've used all ${quota.limit} prints for this ${period}.`
              : `${quota.remaining} of ${quota.limit} prints left this ${period}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {resetLabel
              ? isOut
                ? `You can submit again on ${resetLabel}`
                : `Resets ${resetLabel}`
              : isOut
                ? 'You can submit again once it resets'
                : null}
          </p>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-text/10"
          role="meter"
          aria-label="Prints used"
          aria-valuemin={0}
          aria-valuemax={quota.limit}
          aria-valuenow={quota.used}
        >
          <div
            className={cn(
              'h-full rounded-full',
              isOut || isLow ? 'bg-status-yellow' : 'bg-purple-light',
            )}
            style={{ width: `${usedShare * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
