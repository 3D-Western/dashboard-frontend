// Pseudonymous product analytics (P-137): "fewest steps for students", measured as what it takes to
// get from opening the dashboard to a submitted print. Only this app's own backend ever receives
// these events (no third-party tracker), the backend files them under a keyed hash of the user id,
// and nothing personal is in them: an event is a type, a fixed label ("print_new.form", "choose_file")
// and the milliseconds since the visit began. Never a file name, text a student typed, job id or URL
// with an id in it. Honours "Do Not Track" and Global Privacy Control, and never gets in the way: a
// failed send is dropped without a word.

import { endpoints } from '@/api/client/endpoints';
import { getBaseUrl } from '@/api/client/utils';

export type AnalyticsEventType = 'session_start' | 'screen_view' | 'tap' | 'print_submitted';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  /** Fixed label; required for screen_view and tap. */
  name?: string;
  /** Milliseconds since the visit (session) began. */
  t: number;
}

/** A visit with no activity for this long is over; the next thing starts a new one. */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
/** Events wait this long to be sent together. */
export const FLUSH_DELAY_MS = 4000;
/** The backend takes at most this many events per batch. */
export const MAX_BATCH = 50;
const LABEL_MAX = 48;
/** Two clicks this close are one tap (a label forwards its click to its input). */
const TAP_DEBOUNCE_MS = 40;

interface Session {
  id: string;
  startedAt: number;
  lastActivityAt: number;
}

/** An event waiting to be sent, with the visit it belongs to (a visit can end before its events go out). */
interface Queued {
  sessionId: string;
  event: AnalyticsEvent;
}

let session: Session | null = null;
let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastScreen: string | null = null;
let lastTapAt = 0;
const submittedJobs = new Set<string>();
let enabled = true;

/** Off for staff: their clicks are not the student journey being measured. */
export function setAnalyticsEnabled(value: boolean) {
  enabled = value;
}

/** Not when the browser says no: "Do Not Track" or Global Privacy Control. */
export function trackingAllowed(): boolean {
  if (!enabled || typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  const dnt = nav.doNotTrack ?? nav.msDoNotTrack ?? (window as { doNotTrack?: string }).doNotTrack;
  if (dnt === '1' || dnt === 'yes') return false;
  if (nav.globalPrivacyControl === true) return false;
  return true;
}

/** A label the backend accepts: lower case letters, digits and _ . : - , 48 characters at most. */
export function sanitizeLabel(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9_.:-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, LABEL_MAX) || 'unknown'
  );
}

/**
 * The screen label of a page: its path with every id-like segment (a uuid or a number) replaced by
 * ":id", so no job id ever leaves the browser. null for the new-print page, which reports its own
 * stages (file, form, review ...) as screens.
 */
export function screenOfPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'home';
  if (segments.join('/') === 'dashboard/jobs/print/new') return null;
  const labels = segments.map((segment) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-|^\d+$/i.test(segment) ? ':id' : segment,
  );
  return sanitizeLabel(labels.join('.'));
}

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Old browsers: a random v4-shaped id (it names a visit, never a person)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function currentSession(now: number): Session {
  if (!session || now - session.lastActivityAt > SESSION_IDLE_MS) {
    session = { id: newSessionId(), startedAt: now, lastActivityAt: now };
    lastScreen = null;
    queue.push({ sessionId: session.id, event: { type: 'session_start', t: 0 } });
  }
  session.lastActivityAt = now;
  return session;
}

function enqueue(type: AnalyticsEventType, name?: string) {
  if (!trackingAllowed()) return;
  const now = Date.now();
  const visit = currentSession(now);
  queue.push({
    sessionId: visit.id,
    event: { type, ...(name ? { name: sanitizeLabel(name) } : {}), t: now - visit.startedAt },
  });
  if (queue.length >= MAX_BATCH) void flush();
  else if (!timer) timer = setTimeout(() => void flush(), FLUSH_DELAY_MS);
}

/** The student is looking at this screen (the same screen again straight after is not a new view). */
export function trackScreen(name: string) {
  const label = sanitizeLabel(name);
  if (label === lastScreen && session) return;
  enqueue('screen_view', label);
  lastScreen = label;
}

/** A tap or click on something; `name` is a fixed label (see `data-track`), or a generic kind of control. */
export function trackTap(name: string) {
  const now = Date.now();
  if (now - lastTapAt < TAP_DEBOUNCE_MS) return;
  lastTapAt = now;
  enqueue('tap', name);
}

/**
 * The student's explicit yes, which sends the print to the farm: the end of the journey being measured.
 * Counted once per job (the key never leaves the browser). The visit ends here; whatever comes next
 * is a new visit, so a second print is timed on its own.
 */
export function trackPrintSubmitted(jobId: string) {
  if (submittedJobs.has(jobId)) return;
  submittedJobs.add(jobId);
  if (!trackingAllowed()) return;
  enqueue('print_submitted');
  session = null;
  void flush();
}

/** Sends what is waiting, one request per visit (at most MAX_BATCH events each). Never throws. */
export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const waiting = queue;
  queue = [];
  const bySession = new Map<string, AnalyticsEvent[]>();
  for (const { sessionId, event } of waiting) {
    bySession.set(sessionId, [...(bySession.get(sessionId) ?? []), event]);
  }
  for (const [sessionId, events] of bySession) {
    for (let i = 0; i < events.length; i += MAX_BATCH) {
      try {
        await fetch(`${getBaseUrl()}${endpoints.analytics.events}`, {
          method: 'POST',
          credentials: 'include',
          // keepalive lets the last batch leave while the page is closing
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, events: events.slice(i, i + MAX_BATCH) }),
        });
      } catch {
        // Analytics never bothers anyone: a batch that cannot be sent is dropped
      }
    }
  }
}

/** Test hook: forget everything. */
export function resetAnalyticsForTests() {
  session = null;
  queue = [];
  lastScreen = null;
  lastTapAt = 0;
  submittedJobs.clear();
  enabled = true;
  if (timer) clearTimeout(timer);
  timer = null;
}
