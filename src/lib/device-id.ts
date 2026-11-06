// A random id this browser keeps, sent as X-Device-Id on login (P-159). The backend's login lockout
// is kept per student number and client, so two people behind one campus address who share this
// browser do not lock each other out. It is not a secret and nothing else is sent it.

const STORAGE_KEY = 'device-id';
const VALID_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** A random UUID (version 4), made from crypto.getRandomValues, which works outside secure contexts too. */
function newDeviceId(): string | null {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') return null;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * This browser's device id, created on first use. Null on the server, or when storage is blocked
 * (private windows, disabled site data): then the header is simply left out.
 */
export function getDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_ID.test(stored)) return stored;
    const fresh = newDeviceId();
    if (!fresh) return null;
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}
