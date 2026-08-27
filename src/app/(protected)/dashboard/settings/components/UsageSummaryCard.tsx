'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/providers/user-provider';
import { useUsageSummary, useAccountLimits } from '@/hooks/useUsage';
import { calculateRemainingQuota } from '@/utils/usage-calculators';
import { SettingsSectionSkeleton } from './SettingsSectionSkeleton';
import { SectionEmptyState } from './SectionEmptyState';
import { SectionErrorState } from './SectionErrorState';
import { UsageMeter } from './UsageMeter';

export function UsageSummaryCard() {
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

  const quota = calculateRemainingQuota(entries, limits);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Usage</CardTitle>
        <CardDescription>Your usage this month</CardDescription>
      </CardHeader>
      <CardContent>
        {usageLoading || limitsLoading ? (
          <SettingsSectionSkeleton label="Loading current usage" />
        ) : usageError || limitsError ? (
          <SectionErrorState
            message="Unable to load your usage."
            onRetry={() => {
              refetchUsage();
              refetchLimits();
            }}
          />
        ) : quota.length === 0 ? (
          <SectionEmptyState
            title="No usage yet"
            description="Submit a job to start tracking your usage against the current period."
          />
        ) : (
          <div className="space-y-4">
            {quota.map((q) => (
              <UsageMeter
                key={q.projectType}
                projectType={q.projectType}
                used={q.used}
                limit={q.limit}
                period="month"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
