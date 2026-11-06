// Pure helpers for the "Ask why" panel (P-54). Nothing here touches storage: the conversation
// lives in the panel's memory only and the pipeline keeps the record.

/** The pipeline cuts a question at this many characters (the backend does too). */
export const DISAGREE_MAX_CHARS = 600;

/** A random RFC 4122 v4 id; works on plain-http pages, where `crypto.randomUUID` is missing. */
export function newRequestId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** "5 seconds", "2 minutes", "about 1 hour": how long until the student may ask again. */
export function formatWait(seconds: number): string {
  if (seconds < 60) {
    const s = Math.max(1, Math.round(seconds));
    return `${s} second${s === 1 ? '' : 's'}`;
  }
  if (seconds < 3600) {
    const m = Math.round(seconds / 60);
    return `${m} minute${m === 1 ? '' : 's'}`;
  }
  const h = Math.round(seconds / 3600);
  return `about ${h} hour${h === 1 ? '' : 's'}`;
}

/** "3 questions left", for the footer of the panel. */
export function questionsLeftText(left: number): string {
  if (left <= 0) return 'No questions left for now.';
  return `${left} question${left === 1 ? '' : 's'} left`;
}

/** The answer was about a plan other than the one on screen (a plan id of null says nothing). */
export function isAboutEarlierPlan(
  answerPlanId: string | null | undefined,
  currentPlanId: string | null | undefined,
): boolean {
  return Boolean(answerPlanId && currentPlanId && answerPlanId !== currentPlanId);
}
