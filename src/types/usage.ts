import { JobCategory } from './jobs';

export type UsagePeriod = 'week' | 'month' | 'semester';

export interface UsageEntry {
  projectType: JobCategory;
  used: number;
  period: UsagePeriod;
}

export interface UsageSummary {
  period: UsagePeriod;
  entries: UsageEntry[];
}

export interface ProjectTypeLimit {
  projectType: JobCategory;
  limit: number; // -1 = unlimited
  period: UsagePeriod;
}

export interface AccountLimits {
  limits: ProjectTypeLimit[];
}

export interface RemainingQuota {
  projectType: JobCategory;
  used: number;
  limit: number;
  remaining: number; // -1 = unlimited
  isUnlimited: boolean;
}
