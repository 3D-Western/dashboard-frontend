'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/providers/user-provider';
import { useUsageSummary, useAccountLimits } from '@/hooks/useUsage';
import { isOverLimit } from '@/utils/usage-calculators';
import { SettingsSectionSkeleton } from './SettingsSectionSkeleton';
import { SectionEmptyState } from './SectionEmptyState';
import { SectionErrorState } from './SectionErrorState';
import { CATEGORY_LABELS } from './categoryLabels';

export function LimitCard() {
  const user = useUser();
  const userId = user ? String(user.studentId) : '';

  const {
    entries,
    isLoading: usageLoading,
    error: usageError,
    refetch: refetchUsage,
  } = useUsageSummary(userId, 'month');
  const {
    limits,
    isLoading: limitsLoading,
    error: limitsError,
    refetch: refetchLimits,
  } = useAccountLimits(userId);

  if (!user) return null;

  const overLimit = isOverLimit(entries, limits);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Limits</CardTitle>
        <CardDescription>Your project limits for the current period</CardDescription>
      </CardHeader>
      <CardContent>
        {usageLoading || limitsLoading ? (
          <SettingsSectionSkeleton label="Loading account limits" />
        ) : usageError || limitsError ? (
          <SectionErrorState
            message="Unable to load your account limits."
            onRetry={() => {
              refetchUsage();
              refetchLimits();
            }}
          />
        ) : limits.length === 0 ? (
          <SectionEmptyState
            title="No account limits configured"
            description="Your project limits will appear here once configured."
          />
        ) : (
          <div className="space-y-4">
            {overLimit && (
              <Alert variant="destructive">
                <AlertTitle>Limit reached</AlertTitle>
                <AlertDescription>
                  You&apos;ve reached the limit for one or more project types this period. New jobs
                  in those categories may be blocked until the next period.
                </AlertDescription>
              </Alert>
            )}
            {limits.map((limit) => {
              const label = CATEGORY_LABELS[limit.projectType];
              const isUnlimited = limit.limit === -1;
              const usedEntry = entries.find((e) => e.projectType === limit.projectType);
              const used = usedEntry?.used ?? 0;
              const limitReached = !isUnlimited && used >= limit.limit;

              return (
                <div
                  key={limit.projectType}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {isUnlimited ? 'Unlimited' : `${limit.limit} per ${limit.period}`}
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
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
