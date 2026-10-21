'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { notificationsApi } from '@/api/client/notifications';
import { ApiError } from '@/api/client/errors';
import type { NotificationPreference, PushDevice } from '@/types/notifications';
import { detectPlatform, isStandalone, type InstallPlatform } from '@/lib/pwa/install-prompt';
import {
  disablePush,
  enablePush,
  endpointId,
  getPushRegistration,
  resolvePushAvailability,
  type PushAvailability,
} from '@/lib/pwa/push';

/** Where the Notifications card is: what to show, from "still checking" to "on for this device". */
export type PushStatus =
  | { kind: 'loading' }
  /** The server could not be asked (offline, signed out...) */
  | { kind: 'error' }
  | { kind: Exclude<PushAvailability, 'available'>; platform: InstallPlatform }
  | { kind: 'off' }
  | { kind: 'on' };

export interface PushNotificationsState {
  status: PushStatus;
  /** Every device that has push on, this one included */
  devices: PushDevice[];
  /** The id of this device in `devices`, when it is on */
  thisDeviceId: string | null;
  preferences: NotificationPreference[];
  /** The name of the action in progress, to disable buttons and show "Working..." */
  busy: 'enable' | 'disable' | 'test' | `preference:${string}` | `device:${number}` | null;
  /** Called by the "Turn on notifications" button (and nothing else) */
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  setPreference: (type: string, enabled: boolean) => Promise<void>;
  sendTest: () => Promise<void>;
  removeDevice: (id: number) => Promise<void>;
  retry: () => void;
}

const messageOf = (error: unknown, fallback: string) =>
  error instanceof ApiError && error.message ? error.message : fallback;

/**
 * Everything the Notifications card needs. It looks at this device (iPhone not installed? blocked?
 * no push?) and at the server, but it never asks the browser for permission by itself: only
 * `enable`, which the "Turn on notifications" button calls, does.
 */
export function usePushNotifications(): PushNotificationsState {
  const [status, setStatus] = useState<PushStatus>({ kind: 'loading' });
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [thisDeviceId, setThisDeviceId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [busy, setBusy] = useState<PushNotificationsState['busy']>(null);
  const [attempt, setAttempt] = useState(0);

  // Needed by the tap handlers; filled in by the effect below, before anything can be tapped
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const publicKey = useRef<string | null>(null);
  const platformRef = useRef<InstallPlatform>('desktop');

  const refreshDevices = useCallback(async (): Promise<boolean> => {
    const list = await notificationsApi.listDevices();
    setDevices(list);
    const subscription = await registration.current?.pushManager.getSubscription();
    const id = subscription ? await endpointId(subscription.endpoint) : null;
    const on = id !== null && list.some((device) => device.endpointId === id);
    setThisDeviceId(on ? id : null);
    return on;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus({ kind: 'loading' });
      try {
        const config = await notificationsApi.getConfig();
        publicKey.current = config.publicKey;

        const platform = detectPlatform({
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          maxTouchPoints: navigator.maxTouchPoints,
        });
        platformRef.current = platform;
        const availability = resolvePushAvailability({
          serverEnabled: config.enabled && !!config.publicKey,
          platform,
          standalone: isStandalone({
            matchMedia: window.matchMedia?.bind(window),
            navigatorStandalone: (navigator as Navigator & { standalone?: boolean }).standalone,
          }),
          hasServiceWorker: 'serviceWorker' in navigator,
          hasPushManager: 'PushManager' in window,
          hasNotification: 'Notification' in window,
          permission: 'Notification' in window ? Notification.permission : 'unsupported',
        });
        if (cancelled) return;
        if (availability !== 'available') {
          setStatus({ kind: availability, platform });
          return;
        }

        // Where this runs without a service worker (development), push cannot work
        registration.current = await getPushRegistration();
        if (!registration.current) {
          if (!cancelled) setStatus({ kind: 'unsupported', platform });
          return;
        }

        const [prefs, on] = await Promise.all([
          notificationsApi.getPreferences(),
          refreshDevices(),
        ]);
        if (cancelled) return;
        setPreferences(prefs.preferences);
        setStatus({ kind: on ? 'on' : 'off' });
      } catch {
        if (!cancelled) setStatus({ kind: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, refreshDevices]);

  const enable = useCallback(async () => {
    const reg = registration.current;
    const key = publicKey.current;
    if (!reg || !key) return;
    setBusy('enable');
    try {
      // First thing awaited: iOS only shows the permission prompt for a direct tap
      const result = await enablePush(reg, key);
      if (result.ok) {
        await refreshDevices();
        setStatus({ kind: 'on' });
        toast.success('Notifications are on for this device');
      } else if (result.reason === 'denied') {
        setStatus({ kind: 'blocked', platform: platformRef.current });
      } else if (result.reason === 'dismissed') {
        toast.message('Notifications stay off until you allow them.');
      } else {
        toast.error(messageOf(result.error, 'Could not turn on notifications. Please try again.'));
      }
    } finally {
      setBusy(null);
    }
  }, [refreshDevices]);

  const disable = useCallback(async () => {
    const reg = registration.current;
    if (!reg) return;
    setBusy('disable');
    try {
      await disablePush(reg);
      await refreshDevices();
      setStatus({ kind: 'off' });
      toast.success('Notifications are off for this device');
    } catch (error) {
      toast.error(messageOf(error, 'Could not turn off notifications. Please try again.'));
    } finally {
      setBusy(null);
    }
  }, [refreshDevices]);

  const setPreference = useCallback(async (type: string, enabled: boolean) => {
    // Show the change at once; put it back if the server says no
    setPreferences((current) =>
      current.map((p) => (p.type === type ? { ...p, pushEnabled: enabled } : p)),
    );
    setBusy(`preference:${type}`);
    try {
      const saved = await notificationsApi.updatePreferences({ [type]: enabled });
      setPreferences(saved.preferences);
    } catch (error) {
      setPreferences((current) =>
        current.map((p) => (p.type === type ? { ...p, pushEnabled: !enabled } : p)),
      );
      toast.error(messageOf(error, 'Could not save that change. Please try again.'));
    } finally {
      setBusy(null);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy('test');
    try {
      const result = await notificationsApi.sendTest();
      if (result.sent > 0) {
        toast.success('Test sent. It should show up in a moment.');
      } else {
        toast.error('The test could not be delivered. Try turning notifications off and on again.');
      }
      if (result.removed > 0) await refreshDevices();
    } catch (error) {
      toast.error(messageOf(error, 'Could not send a test. Please try again.'));
    } finally {
      setBusy(null);
    }
  }, [refreshDevices]);

  const removeDevice = useCallback(
    async (id: number) => {
      setBusy(`device:${id}`);
      try {
        await notificationsApi.removeDevice(id);
        await refreshDevices();
      } catch (error) {
        toast.error(messageOf(error, 'Could not remove that device. Please try again.'));
      } finally {
        setBusy(null);
      }
    },
    [refreshDevices],
  );

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    status,
    devices,
    thisDeviceId,
    preferences,
    busy,
    enable,
    disable,
    setPreference,
    sendTest,
    removeDevice,
    retry,
  };
}
