import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { apiRequest } from './base';
import type { Signoff } from '@/types/signoff';

const get = <T>(path: string, options?: RequestInit) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, { method: 'GET', credentials: 'include', ...options });

const post = <T>(path: string, body: unknown, options?: RequestInit) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(body),
    ...options,
  });

export const signoffAPI = {
  /** Students waiting for an in-person sign-off, oldest first. */
  list: (options?: RequestInit) => get<Signoff[]>(endpoints.signoff.list, options),

  get: (signoffId: number, options?: RequestInit) =>
    get<Signoff>(endpoints.signoff.byId(signoffId), options),

  /** Send every checklist item's key: the server refuses an approval with an item unticked. */
  approve: (signoffId: number, checkedKeys: string[], notes?: string) =>
    post<Signoff>(endpoints.signoff.approve(signoffId), { checkedKeys, notes }),

  /** The reason is required. The student retakes the training. */
  reject: (signoffId: number, reason: string, checkedKeys: string[] = []) =>
    post<Signoff>(endpoints.signoff.reject(signoffId), { reason, checkedKeys }),
};
