import { ApiGetCurrentSessionResponse, ApiLoginResponse } from '../types';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

export const sessionApi = {
  current: async (options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<ApiGetCurrentSessionResponse>(`${serverUrl}${endpoints.session.current}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },
  login: async (studentId: number, password: string, options?: RequestInit) => {
    const serverUrl = getBaseUrl();

    return apiRequest<ApiLoginResponse>(`${serverUrl}${endpoints.session.login}`, {
      method: 'POST',
      body: JSON.stringify({ studentId, password }),
      ...options,
    });
  },
};
