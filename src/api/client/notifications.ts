import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { apiRequest } from './base';
import type {
  NotificationPreferences,
  PushConfig,
  PushDevice,
  PushSubscriptionPayload,
  PushTestResult,
} from '@/types/notifications';

const request = <T>(method: string, path: string, body?: unknown, options?: RequestInit) =>
  apiRequest<T>(`${getBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...options,
  });

export const notificationsApi = {
  /** Is push available on this server, and the public key to subscribe with. */
  getConfig: (options?: RequestInit) =>
    request<PushConfig>('GET', endpoints.notifications.pushConfig, undefined, options),

  /** The devices I have turned push on for. */
  listDevices: (options?: RequestInit) =>
    request<PushDevice[]>('GET', endpoints.notifications.devices, undefined, options),

  /** Turn push on for this device. Safe to repeat. */
  subscribe: (subscription: PushSubscriptionPayload, options?: RequestInit) =>
    request<PushDevice>('POST', endpoints.notifications.devices, subscription, options),

  /** Turn push off for this device, by the address the browser holds. Safe to repeat. */
  unsubscribe: (endpoint: string, options?: RequestInit) =>
    request<null>('POST', endpoints.notifications.unsubscribe, { endpoint }, options),

  /** Remove one of my other devices from the list. */
  removeDevice: (id: number, options?: RequestInit) =>
    request<null>('DELETE', endpoints.notifications.device(id), undefined, options),

  /** Send myself a test notification (every device, whatever the type settings). */
  sendTest: (options?: RequestInit) =>
    request<PushTestResult>('POST', endpoints.notifications.test, undefined, options),

  getPreferences: (options?: RequestInit) =>
    request<NotificationPreferences>(
      'GET',
      endpoints.notifications.preferences,
      undefined,
      options,
    ),

  /** Change some types (e.g. `{ PRINT_JOBS: false }`); the rest stay as they are. */
  updatePreferences: (changes: Record<string, boolean>, options?: RequestInit) =>
    request<NotificationPreferences>(
      'PUT',
      endpoints.notifications.preferences,
      { preferences: changes },
      options,
    ),
};
