import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, userEvent } from '@test/utils/render';
import { createMockUser, perm } from '@test/utils/mockFactories';
import { PERMISSIONS } from '@/constants/permissions';
import { flush, resetAnalyticsForTests } from '@/lib/analytics';
import { AnalyticsTracker, tapLabel } from './AnalyticsTracker';

// The current path, changed by the tests that move between pages.
const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

let fetchMock: ReturnType<typeof vi.fn>;

/** The events the browser has sent so far, after the pending batch is flushed. */
async function sentEvents() {
  await flush();
  return fetchMock.mock.calls.flatMap(([, init]) => {
    const body = JSON.parse(String(init?.body)) as { events: { type: string; name?: string }[] };
    return body.events;
  });
}

beforeEach(() => {
  nav.pathname = '/';
  fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
  resetAnalyticsForTests();
});

afterEach(() => {
  resetAnalyticsForTests();
  vi.unstubAllGlobals();
});

describe('tapLabel', () => {
  it('uses the data-track name of the section a control sits in', () => {
    render(
      <div data-track="print_new.file">
        <button>Upload my_secret.stl</button>
      </div>,
    );

    expect(tapLabel(screen.getByText('Upload my_secret.stl'))).toBe('print_new.file');
  });

  it('falls back to the kind of control, never its text', () => {
    render(
      <div>
        <button>Save draft</button>
        <a href="/faqs">Read the FAQs</a>
        <input aria-label="Student name" />
        <input type="radio" aria-label="Lying flat" />
        <div role="radio" aria-checked="false" tabIndex={0}>
          Standing up
        </div>
      </div>,
    );

    expect(tapLabel(screen.getByRole('button', { name: 'Save draft' }))).toBe('button');
    expect(tapLabel(screen.getByRole('link', { name: 'Read the FAQs' }))).toBe('link');
    expect(tapLabel(screen.getByLabelText('Student name'))).toBe('field');
    expect(tapLabel(screen.getByLabelText('Lying flat'))).toBe('choice');
    expect(tapLabel(screen.getByText('Standing up'))).toBe('choice');
  });

  it('gives nothing for a click on plain text', () => {
    render(<p>Your print is on its way.</p>);

    expect(tapLabel(screen.getByText('Your print is on its way.'))).toBeNull();
  });
});

describe('AnalyticsTracker', () => {
  it('reports the screen the student is on, without its ids', async () => {
    nav.pathname = '/dashboard/jobs/1042';
    render(<AnalyticsTracker />, { user: createMockUser() });

    expect(await sentEvents()).toContainEqual(
      expect.objectContaining({ type: 'screen_view', name: 'dashboard.jobs.:id' }),
    );
  });

  it('reports nothing at all for a user with an admin-section permission', async () => {
    const staff = createMockUser({ permissions: [perm(PERMISSIONS.USERS_LIST)] });
    const user = userEvent.setup();
    render(
      <>
        <AnalyticsTracker />
        <button>Save draft</button>
      </>,
      { user: staff },
    );

    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await sentEvents()).toEqual([]);
  });

  it('reports the tap label of what the student clicked', async () => {
    const user = userEvent.setup();
    render(
      <>
        <AnalyticsTracker />
        <div data-track="print_new.form">
          <button>Next</button>
        </div>
      </>,
      { user: createMockUser() },
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await sentEvents()).toContainEqual({
      type: 'tap',
      name: 'print_new.form',
      t: expect.any(Number),
    });
  });
});
