import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { apiRequest } from './base';
import { UsageSummary, AccountLimits, UsagePeriod } from '@/types/usage';

export const usageAPI = {
  // client wrapper for fetching usage summary by period
  getUsageSummary: async (userId: string, period?: UsagePeriod, options?: RequestInit) => {
    const searchParams = new URLSearchParams();
    if (period !== undefined) {
      searchParams.append('period', period);
    }
    const queryString = searchParams.toString();
    const url = `${getBaseUrl()}${endpoints.usage.summary(userId)}${queryString ? `?${queryString}` : ''}`;

    return apiRequest<UsageSummary>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  // client wrapper for fetching account limits/quotas
  getAccountLimits: async (userId: string, options?: RequestInit) => {
    return apiRequest<AccountLimits>(`${getBaseUrl()}${endpoints.usage.limits(userId)}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },
};
