// ---------------------------------------------------------------------------------------------
// Web push in the browser: can this device get notifications, and turning them on and off.
// No React here, so every rule is easy to test. The screen is src/components/Notifications.
//
// Two rules matter most:
//  - The browser's permission prompt is shown ONLY by `enablePush`, which the "Turn on
//    notifications" button calls. Nothing asks on page load.
//  - On iPhone and iPad, web push only exists for an app added to the Home Screen. In a normal
//    Safari tab there is no PushManager at all, so we explain that instead of failing.
// ---------------------------------------------------------------------------------------------

import { notificationsApi } from '@/api/client/notifications';
import type { InstallPlatform } from './install-prompt';

/** What this device can do about notifications, in the order the screen needs to decide. */
export type PushAvailability =
  /** The server has no VAPID keys: push is off for everyone */
  | 'server-off'
  /** iPhone/iPad in a browser tab: add the app to the Home Screen first */
  | 'needs-install'
  /** Inside another app's browser (Teams, Instagram...): open the page in the real browser */
  | 'open-in-browser'
  /** This browser has no push (or no service worker) */
  | 'unsupported'
  /** The student said no to notifications for this site: only the browser's settings can undo it */
  | 'blocked'
  | 'available';

export interface AvailabilityInput {
  serverEnabled: boolean;
  platform: InstallPlatform;
  standalone: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  permission: NotificationPermission | 'unsupported';
}

export function resolvePushAvailability(input: AvailabilityInput): PushAvailability {
  if (!input.serverEnabled) return 'server-off';
  const onIos = input.platform === 'ios' || input.platform === 'ios-chrome';
  // Checked before capability: Safari in a tab doesn't expose PushManager, which would look like "unsupported"
  if (onIos && !input.standalone) return 'needs-install';
  if (input.platform === 'ios-webview' || input.platform === 'android-webview') {
    return 'open-in-browser';
  }
  if (!input.hasServiceWorker || !input.hasPushManager || !input.hasNotification) {
    return 'unsupported';
  }
  if (input.permission === 'denied') return 'blocked';
  return 'available';
}

/** The browser wants the server's public key as bytes; ours is base64url text. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * SHA-256 of the push address as lowercase hex: the same id the server gives each device, so this
 * browser can find itself in the list without the address ever being sent back.
 */
export async function endpointId(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The service worker registration, once there is one. It is registered at app start (production
 * only), so right after the first page load it may not exist yet; in development it never does,
 * and we must not wait forever.
 */
export async function getPushRegistration(
  nav: Pick<Navigator, 'serviceWorker'> = navigator,
  timeoutMs = 4000,
): Promise<ServiceWorkerRegistration | null> {
  if (!nav.serviceWorker) return null;
  const existing = await nav.serviceWorker.getRegistration();
  if (existing) return existing;
  return Promise.race([
    nav.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: 'denied' | 'dismissed' | 'failed'; error?: unknown };

/**
 * Turns notifications on for this device. MUST be called from a tap: it is the one place that
 * shows the browser's permission prompt, and iOS only allows that from a user gesture, so the
 * permission request is the first thing awaited here.
 */
export async function enablePush(
  registration: ServiceWorkerRegistration,
  publicKey: string,
): Promise<EnableResult> {
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return { ok: false, reason: 'denied' };
  if (permission !== 'granted') return { ok: false, reason: 'dismissed' };

  try {
    const subscription = await subscribeOnce(registration, publicKey);
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      return { ok: false, reason: 'failed' };
    }
    await notificationsApi.subscribe({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'failed', error };
  }
}

async function subscribeOnce(
  registration: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription> {
  const options = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  };
  try {
    return await registration.pushManager.subscribe(options);
  } catch (error) {
    // The server's key changed since this device subscribed: drop the old subscription and try again
    if (error instanceof DOMException && error.name === 'InvalidStateError') {
      const old = await registration.pushManager.getSubscription();
      await old?.unsubscribe();
      return registration.pushManager.subscribe(options);
    }
    throw error;
  }
}

/** Turns notifications off for this device: forgets the browser subscription, then tells the server. */
export async function disablePush(registration: ServiceWorkerRegistration): Promise<void> {
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => false);
  await notificationsApi.unsubscribe(endpoint);
}

/**
 * Called when someone signs out: stop this device receiving that person's notifications, so the
 * next person on a shared phone or laptop doesn't see them. Best effort and quick: signing out
 * never waits on it for long and never fails because of it.
 */
export async function unsubscribeThisDeviceQuietly(
  nav: Pick<Navigator, 'serviceWorker'> | { serviceWorker?: undefined } = typeof navigator ===
  'undefined'
    ? {}
    : navigator,
  timeoutMs = 2000,
): Promise<void> {
  if (!nav.serviceWorker) return;
  const work = (async () => {
    const registration = await nav.serviceWorker!.getRegistration();
    if (registration) await disablePush(registration);
  })().catch(() => {
    // Not signed in any more, offline, or no subscription: nothing to do
  });
  await Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}
