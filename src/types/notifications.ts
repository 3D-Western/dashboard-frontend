// Web push API (/api/v1/notifications). See docs/specs/notifications.md.

export interface PushConfig {
  /** False when the server has no VAPID keys: push is off for everyone */
  enabled: boolean;
  /** base64url of the server's public key; what pushManager.subscribe() needs */
  publicKey: string | null;
}

/** One device with push on. `endpointId` is the SHA-256 (hex) of the push address, never the address itself. */
export interface PushDevice {
  id: number;
  label: string;
  endpointId: string;
  createdAt: string;
  lastSuccessAt: string | null;
}

/** The browser's PushSubscription.toJSON() reduced to what the server stores */
export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface NotificationPreference {
  /** e.g. TRAINING_REMINDERS */
  type: string;
  label: string;
  description: string;
  pushEnabled: boolean;
}

export interface NotificationPreferences {
  preferences: NotificationPreference[];
}

export interface PushTestResult {
  sent: number;
  removed: number;
  failed: number;
}
