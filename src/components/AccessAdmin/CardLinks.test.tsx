import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { accessAdminAPI } from '@/api/client/access-admin';
import { createCardLink, createStudent } from '@test/utils/accessAdminFactories';
import { CardLinks } from './CardLinks';

vi.mock('@/api/client/access-admin', () => ({
  accessAdminAPI: {
    searchStudents: vi.fn(),
    listCardLinks: vi.fn(),
    deactivateCardLink: vi.fn(),
  },
}));

const api = accessAdminAPI as unknown as Record<string, Mock>;

const page = (links: ReturnType<typeof createCardLink>[]) => ({
  data: links,
  pagination: {
    page: 1,
    pageSize: 100,
    totalItems: links.length,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    snapshotCreatedBefore: '',
  },
});

beforeEach(() => {
  api.searchStudents.mockResolvedValue([
    createStudent(),
    createStudent({
      studentNumber: 251000009,
      firstName: 'Ada',
      lastName: 'Byron',
      email: 'abyron@uwo.ca',
    }),
  ]);
  api.listCardLinks.mockResolvedValue(
    page([
      createCardLink(),
      createCardLink({
        id: 71,
        uid: '04CCDD02',
        active: false,
        source: 'ADMIN',
        deactivatedAt: new Date().toISOString(),
        deactivatedReason: 'lost card',
      }),
    ]),
  );
});

async function findStudentCards() {
  render(<CardLinks />);
  await userEvent.type(screen.getByRole('textbox', { name: /find a student/i }), 'ada');
  await userEvent.click(screen.getByRole('button', { name: /search/i }));
  await userEvent.click(await screen.findByRole('button', { name: /ada lovelace/i }));
  return screen.findByRole('region', { name: /cards linked to ada lovelace/i });
}

describe('CardLinks search', () => {
  it('finds students and shows the cards of the one chosen, active first', async () => {
    const cards = await findStudentCards();

    expect(api.searchStudents).toHaveBeenCalledWith('ada');
    expect(api.listCardLinks).toHaveBeenCalledWith(251234567);
    expect(await within(cards).findByText('04AABB01')).toBeInTheDocument();
    expect(within(cards).getByText('Active')).toBeInTheDocument();
    expect(within(cards).getByText(/linked at the kiosk/i)).toBeInTheDocument();
    expect(within(cards).getByText(/unlinked earlier/i)).toBeInTheDocument();
    expect(within(cards).getByText('04CCDD02')).toBeInTheDocument();
    expect(within(cards).getByText(/lost card/)).toBeInTheDocument();
    // A closed card cannot be unlinked again.
    expect(
      within(cards).queryByRole('button', { name: /unlink card 04CCDD02/i }),
    ).not.toBeInTheDocument();
  });

  it('asks for at least two characters before searching', async () => {
    render(<CardLinks />);
    await userEvent.type(screen.getByRole('textbox', { name: /find a student/i }), 'a');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    expect(api.searchStudents).not.toHaveBeenCalled();
  });

  it('says when no student matches', async () => {
    api.searchStudents.mockResolvedValue([]);
    render(<CardLinks />);
    await userEvent.type(screen.getByRole('textbox', { name: /find a student/i }), 'zzz');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(await screen.findByText(/no student matches/i)).toBeInTheDocument();
  });

  it('says when a student has no card yet', async () => {
    api.listCardLinks.mockResolvedValue(page([]));
    await findStudentCards();

    expect(await screen.findByText(/no card is linked to this student yet/i)).toBeInTheDocument();
  });
});

describe('CardLinks unlinking', () => {
  async function openUnlink() {
    const cards = await findStudentCards();
    await userEvent.click(
      await within(cards).findByRole('button', { name: /unlink card 04AABB01/i }),
    );
    return screen.findByRole('dialog');
  }

  it('asks for confirmation and a reason, and unlinks nothing until both are given', async () => {
    const dialog = await openUnlink();

    expect(
      within(dialog).getByText(/will no longer be able to use this card/i),
    ).toBeInTheDocument();
    expect(api.deactivateCardLink).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Unlink card' }));

    expect(within(dialog).getByText(/say why/i)).toBeInTheDocument();
    expect(api.deactivateCardLink).not.toHaveBeenCalled();
  });

  it('leaves the card linked when the admin backs out', async () => {
    const dialog = await openUnlink();
    await userEvent.type(within(dialog).getByRole('textbox'), 'lost card');

    await userEvent.click(within(dialog).getByRole('button', { name: /keep the card linked/i }));

    expect(api.deactivateCardLink).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('unlinks with the reason and reloads the cards', async () => {
    api.deactivateCardLink.mockResolvedValue(createCardLink({ active: false }));
    const dialog = await openUnlink();
    await userEvent.type(within(dialog).getByRole('textbox'), '  lost card ');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Unlink card' }));

    await waitFor(() => expect(api.deactivateCardLink).toHaveBeenCalledWith(70, 'lost card'));
    await waitFor(() => expect(api.listCardLinks).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the server’s reason when it refuses', async () => {
    api.deactivateCardLink.mockRejectedValue(
      new ApiError('CARD_LINK_ALREADY_CLOSED', 'That card link is already closed.'),
    );
    const dialog = await openUnlink();
    await userEvent.type(within(dialog).getByRole('textbox'), 'lost card');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Unlink card' }));

    expect(await within(dialog).findByText(/already closed/i)).toBeInTheDocument();
  });
});
