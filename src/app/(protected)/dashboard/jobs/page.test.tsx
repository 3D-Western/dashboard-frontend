import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyJobsPage from './page';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock('@/api/client/user', () => ({
  userApi: {
    getCurrentUserJobs: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
  },
}));
vi.mock('@/components/Filters', () => ({ FilterToolbar: () => null }));
vi.mock('./components/JobList', () => ({ JobList: () => null }));
vi.mock('./components/JobsViewToggle', () => ({ JobsViewToggle: () => null }));

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function renderPage(searchParams: { submitted?: string } = {}) {
  render(await MyJobsPage({ searchParams: Promise.resolve(searchParams) }));
}

beforeEach(() => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('My Jobs: add the app to the home screen', () => {
  it('offers it right after a print is submitted', async () => {
    await renderPage({ submitted: '1' });

    expect(
      await screen.findByRole('heading', { name: /keep 3d western on your home screen/i }),
    ).toBeInTheDocument();
  });

  it('does not offer it on an ordinary visit', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { name: 'My Jobs' })).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
