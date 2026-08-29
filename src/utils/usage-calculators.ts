import { TrainingLevel } from '@/types/training';
import { UsageEntry, UsagePeriod, ProjectTypeLimit, RemainingQuota } from '@/types/usage';

export function canAccessBooking(trainingLevel: TrainingLevel | null | undefined): boolean {
  return trainingLevel === 'LEVEL_2';
}

// Placeholder aggregation: counts completed jobs per project type for the given
// mock period. Real period-windowing (actual date-range filtering) is TBD —
// this works off whatever job list is passed in. Only needs `category`, so it
// accepts either PrintJob variant in the codebase (app-level or mocks-level).
export function calculateUsage(jobs: { category: string }[], period: UsagePeriod): UsageEntry[] {
  const counts = new Map<string, number>();
  jobs.forEach((job) => {
    counts.set(job.category, (counts.get(job.category) ?? 0) + 1);
  });

  return Array.from(counts.entries()).map(([projectType, used]) => ({
    projectType: projectType as UsageEntry['projectType'],
    used,
    period,
  }));
}

export function calculateRemainingQuota(
  usage: UsageEntry[],
  limits: ProjectTypeLimit[],
): RemainingQuota[] {
  return limits.map((limit) => {
    const matchingUsage = usage.find((u) => u.projectType === limit.projectType);
    const used = matchingUsage?.used ?? 0;
    const isUnlimited = limit.limit === -1;

    return {
      projectType: limit.projectType,
      used,
      limit: limit.limit,
      remaining: isUnlimited ? -1 : Math.max(limit.limit - used, 0),
      isUnlimited,
    };
  });
}

export function isOverLimit(usage: UsageEntry[], limits: ProjectTypeLimit[]): boolean {
  return calculateRemainingQuota(usage, limits).some(
    (quota) => !quota.isUnlimited && quota.remaining <= 0,
  );
}
