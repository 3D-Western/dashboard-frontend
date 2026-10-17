import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { FilterToolbar } from './FilterToolbar';

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  usePathname: () => '/admin/jobs',
  useSearchParams: () => mockSearchParams,
}));

const OPTIONS = [
  { value: 'InQueue', label: 'In queue' },
  { value: 'Printing', label: 'Printing' },
];

function renderToolbar(trailing?: React.ReactNode) {
  return render(
    <FilterToolbar
      searchPlaceholder="Search jobs..."
      searchLabel="Search jobs"
      statusOptions={OPTIONS}
      trailing={trailing}
    />,
  );
}

describe('FilterToolbar', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it('searches once the user stops typing, not on every keystroke', async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.type(screen.getByRole('searchbox', { name: /search jobs/i }), 'gear');

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/admin/jobs?search=gear', { scroll: false }),
    );
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('clears the search with the clear button', async () => {
    mockSearchParams = new URLSearchParams('search=gear&page=2');
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole('button', { name: /clear search/i }));

    // Clearing a filter also goes back to the first page
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/jobs', { scroll: false }));
  });

  it('shows the status from the URL in the dropdown', () => {
    mockSearchParams = new URLSearchParams('status=Printing');
    renderToolbar();

    expect(screen.getByRole('combobox', { name: /filter by status/i })).toHaveTextContent(
      'Printing',
    );
  });

  it('renders extra controls at the end of the bar', () => {
    renderToolbar(<button type="button">Table view</button>);

    expect(screen.getByRole('button', { name: 'Table view' })).toBeInTheDocument();
  });
});
