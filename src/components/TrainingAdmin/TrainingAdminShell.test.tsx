import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { render } from '@test/utils/render';
import { createMockUser, perm } from '@test/utils/mockFactories';
import { TrainingAdminShell } from './TrainingAdminShell';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin/training'),
  useRouter: () => ({ push: vi.fn() }),
}));

const mockPathname = vi.mocked(usePathname);

const renderShell = (permissions: string[]) =>
  render(
    <TrainingAdminShell>
      <p>Editor content</p>
    </TrainingAdminShell>,
    { user: createMockUser({ permissions: permissions.map((key) => perm(key)) }) },
  );

describe('TrainingAdminShell permission-based visibility', () => {
  it('shows the editor and its sections to someone who can author', () => {
    renderShell(['training:author']);

    expect(screen.getByText('Editor content')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: /training editor sections/i });
    expect(nav).toHaveTextContent('Trainings');
    expect(screen.getByRole('link', { name: 'Equipment' })).toHaveAttribute(
      'href',
      '/admin/training/equipment',
    );
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute(
      'href',
      '/admin/training/import',
    );
  });

  it('shows the editor to someone who can author and publish', () => {
    renderShell(['training:author', 'training:publish']);

    expect(screen.getByText('Editor content')).toBeInTheDocument();
  });

  it('denies access to someone with neither training permission', () => {
    renderShell(['users:list', 'invitations:list']);

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText('Editor content')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('denies access to a signed-out visitor', () => {
    render(
      <TrainingAdminShell>
        <p>Editor content</p>
      </TrainingAdminShell>,
      { user: null },
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it('lets a publisher without author access look around, with a note and no import', () => {
    renderShell(['training:publish']);

    expect(screen.getByText('Editor content')).toBeInTheDocument();
    expect(screen.getByText(/you can look and publish, but not edit/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trainings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Equipment' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Import' })).not.toBeInTheDocument();
  });

  it('does not show the note to an author', () => {
    renderShell(['training:author']);

    expect(screen.queryByText(/you can look and publish/i)).not.toBeInTheDocument();
  });

  it('links to the audit log from the editor, for someone who can author or only publish', () => {
    const { unmount } = renderShell(['training:author']);
    expect(screen.getByRole('link', { name: 'Audit log' })).toHaveAttribute(
      'href',
      '/admin/training/audit-log',
    );
    unmount();

    renderShell(['training:publish']);
    expect(screen.getByRole('link', { name: 'Audit log' })).toHaveAttribute(
      'href',
      '/admin/training/audit-log',
    );
  });

  it('marks the current section', () => {
    mockPathname.mockReturnValue('/admin/training/equipment');
    renderShell(['training:author']);

    expect(screen.getByRole('link', { name: 'Equipment' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Trainings' })).not.toHaveAttribute('aria-current');
  });

  it('keeps "Trainings" highlighted inside one training', () => {
    mockPathname.mockReturnValue('/admin/training/12/draft');
    renderShell(['training:author']);

    expect(screen.getByRole('link', { name: 'Trainings' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('TrainingAdminShell pill strip on a phone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockPathname.mockReturnValue('/admin/training');
  });

  it('scrolls the current section into view so it is not hidden under the fade', () => {
    mockPathname.mockReturnValue('/admin/training/audit-log');
    // The strip is 300 px wide; the active pill ends at 420 px, under the 2rem fade on the right
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const isNav = this.tagName === 'NAV';
      const isActive = this.getAttribute('aria-current') === 'page';
      const box = isNav
        ? { left: 0, right: 300 }
        : isActive
          ? { left: 320, right: 420 }
          : { left: 0, right: 0 };
      return { ...box, top: 0, bottom: 0, width: box.right - box.left, height: 0 } as DOMRect;
    });
    renderShell(['training:author']);

    const nav = screen.getByRole('navigation', { name: /training editor sections/i });
    expect(nav.scrollLeft).toBe(152);
  });
});
