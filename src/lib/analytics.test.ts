import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { endpoints } from '@/api/client/endpoints';
import { getBaseUrl } from '@/api/client/utils';
import { tapLabel } from '@/components/Analytics/AnalyticsTracker';
import {
  FLUSH_DELAY_MS,
  MAX_BATCH,
  SESSION_IDLE_MS,
  flush,
  resetAnalyticsForTests,
  sanitizeLabel,
  screenOfPath,
  setAnalyticsEnabled,
  trackPrintSubmitted,
  trackScreen,
  trackTap,
} from './analytics';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const LABEL = /^[a-z0-9_.:-]{1,48}$/;

interface SentBody {
  sessionId: string;
  events: { type: string; name?: string; t: number }[];
}

let fetchMock: ReturnType<typeof vi.fn>;
const restoreNavigator: (() => void)[] = [];

/** Makes one navigator property read as `value` for the test; undone in afterEach. */
function setNavigatorProperty(key: 'doNotTrack' | 'globalPrivacyControl', value: unknown) {
  const original = Object.getOwnPropertyDescriptor(navigator, key);
  Object.defineProperty(navigator, key, { value, configurable: true });
  restoreNavigator.push(() => {
    if (original) Object.defineProperty(navigator, key, original);
    else Reflect.deleteProperty(navigator, key);
  });
}

/** Every batch the browser has sent, in order. */
function sentBodies(): SentBody[] {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as SentBody);
}

function sentEvents() {
  return sentBodies().flatMap((body) => body.events);
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
  resetAnalyticsForTests();
});

afterEach(() => {
  resetAnalyticsForTests();
  restoreNavigator.splice(0).forEach((restore) => restore());
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('analytics batches', () => {
  it('starts a visit with its first screen and sends it to the events endpoint', async () => {
    trackScreen('dashboard.jobs');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${getBaseUrl()}${endpoints.analytics.events}`);
    expect(init).toMatchObject({ method: 'POST', credentials: 'include', keepalive: true });
    const body = JSON.parse(String(init?.body)) as SentBody;
    expect(body.sessionId).toMatch(UUID);
    expect(body.events).toEqual([
      { type: 'session_start', t: 0 },
      { type: 'screen_view', name: 'dashboard.jobs', t: 0 },
    ]);
  });

  it('waits for the batch delay, then sends everything that came in together', async () => {
    trackScreen('dashboard.jobs');
    trackTap('button');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentEvents().map((event) => event.type)).toEqual([
      'session_start',
      'screen_view',
      'tap',
    ]);
  });

  it('splits a long visit into batches of at most MAX_BATCH events', async () => {
    const screens = MAX_BATCH + 10;
    for (let i = 0; i < screens; i += 1) trackScreen(`step-${i}`);
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    const bodies = sentBodies();
    expect(bodies.length).toBeGreaterThan(1);
    for (const body of bodies) {
      expect(body.events.length).toBeLessThanOrEqual(MAX_BATCH);
    }
    // the session_start plus every screen, none lost
    expect(sentEvents()).toHaveLength(screens + 1);
  });

  it('counts the same screen twice in a row once', async () => {
    trackScreen('dashboard.jobs');
    trackScreen('dashboard.jobs');
    trackScreen('dashboard.orders');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    expect(sentEvents().filter((event) => event.type === 'screen_view')).toEqual([
      { type: 'screen_view', name: 'dashboard.jobs', t: 0 },
      { type: 'screen_view', name: 'dashboard.orders', t: 0 },
    ]);
  });
});

describe('taps', () => {
  it('records a fixed label with the time since the visit began', async () => {
    trackScreen('dashboard.jobs');
    await vi.advanceTimersByTimeAsync(1500);
    trackTap('button');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    expect(sentEvents()).toContainEqual({ type: 'tap', name: 'button', t: 1500 });
  });

  it('counts two taps within 40 ms as one', async () => {
    trackScreen('dashboard.jobs');
    trackTap('button');
    await vi.advanceTimersByTimeAsync(20);
    trackTap('button');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    expect(sentEvents().filter((event) => event.type === 'tap')).toHaveLength(1);
  });

  it('never sends the text of a button or the name of a file', async () => {
    document.body.innerHTML = '<button>my_secret.stl</button>';
    const label = tapLabel(document.querySelector('button'));
    expect(label).not.toBeNull();

    trackScreen('print_new.file');
    trackTap(label ?? 'unknown');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    const sent = JSON.stringify(sentBodies());
    expect(sent).toContain('"name":"button"');
    expect(sent).not.toContain('my_secret');
    expect(sent).not.toContain('.stl');
  });
});

describe('finishing a print', () => {
  it('sends the print_submitted event at once', () => {
    trackScreen('print_new.review');
    trackPrintSubmitted('job-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = sentBodies()[0];
    expect(body.events.map((event) => event.type)).toEqual([
      'session_start',
      'screen_view',
      'print_submitted',
    ]);
  });

  it('sends nothing more for the same job', async () => {
    trackPrintSubmitted('job-1');
    trackPrintSubmitted('job-1');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ends the visit, so the next screen starts a new one', async () => {
    trackScreen('print_new.review');
    trackPrintSubmitted('job-1');
    trackScreen('dashboard.jobs');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    const [first, second] = sentBodies();
    expect(second.sessionId).not.toBe(first.sessionId);
    expect(second.events[0]).toEqual({ type: 'session_start', t: 0 });
  });
});

describe('visits', () => {
  it('starts a new visit after SESSION_IDLE_MS without activity', async () => {
    trackScreen('dashboard.jobs');
    await vi.advanceTimersByTimeAsync(SESSION_IDLE_MS + 1000);
    trackScreen('dashboard.orders');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    const [before, after] = sentBodies();
    expect(after.sessionId).not.toBe(before.sessionId);
    expect(after.events[0]).toEqual({ type: 'session_start', t: 0 });
  });

  it('keeps one visit going while the student stays active', async () => {
    trackScreen('dashboard.jobs');
    await vi.advanceTimersByTimeAsync(SESSION_IDLE_MS - 60_000);
    trackTap('button');
    await vi.advanceTimersByTimeAsync(SESSION_IDLE_MS - 60_000);
    trackTap('button');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    expect(new Set(sentBodies().map((body) => body.sessionId)).size).toBe(1);
  });
});

describe('privacy settings', () => {
  it('sends nothing when the browser asks for Do Not Track', async () => {
    setNavigatorProperty('doNotTrack', '1');
    trackScreen('dashboard.jobs');
    trackTap('button');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing when Global Privacy Control is on', async () => {
    setNavigatorProperty('globalPrivacyControl', true);
    trackScreen('dashboard.jobs');
    trackTap('button');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing once analytics is switched off', async () => {
    setAnalyticsEnabled(false);
    trackScreen('dashboard.jobs');
    trackPrintSubmitted('job-1');
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('failed sends', () => {
  it('drops a batch that cannot be sent, without throwing or retrying', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    trackScreen('dashboard.jobs');

    await expect(flush()).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(10 * SESSION_IDLE_MS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('labels', () => {
  it('replaces the id in a path with :id, so no job id is sent', () => {
    expect(screenOfPath('/dashboard/jobs/3f2b8c1e-9a4d-4b7e-8f21-6c0d5e9a1b2c')).toBe(
      'dashboard.jobs.:id',
    );
    expect(screenOfPath('/dashboard/jobs/1042')).toBe('dashboard.jobs.:id');
  });

  it('names the home page, and leaves the new-print page to its own stages', () => {
    expect(screenOfPath('/')).toBe('home');
    expect(screenOfPath('/dashboard/jobs/print/new')).toBeNull();
  });

  it('always gives a label the backend accepts', () => {
    const paths = [
      '/dashboard/jobs/My File (final).STL',
      '/Ünïcode/ß/ümlaut',
      '/a'.repeat(60),
      '/!!!',
      '/dashboard/Résumé/9f8e7d6c-5b4a-4321-8abc-def012345678',
    ];
    for (const path of paths) {
      const label = screenOfPath(path);
      expect(label).toMatch(LABEL);
    }
    expect(sanitizeLabel('Print Now!')).toBe('print-now');
    expect(sanitizeLabel('!!!')).toBe('unknown');
    expect(sanitizeLabel('x'.repeat(100))).toHaveLength(48);
  });
});
