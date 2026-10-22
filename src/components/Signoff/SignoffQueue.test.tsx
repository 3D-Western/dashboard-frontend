import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { signoffAPI } from '@/api/client/signoff';
import { createSignoff } from '@test/utils/signoffFactories';
import { SignoffQueue } from './SignoffQueue';

vi.mock('@/api/client/signoff', () => ({
  signoffAPI: { list: vi.fn() },
}));

const list = signoffAPI.list as unknown as Mock;
const NOW = new Date('2026-10-20T16:30:00Z');

beforeEach(() => {
  list.mockReset();
});

describe('SignoffQueue', () => {
  it('lists each waiting student with their number, training and how long ago they passed', async () => {
    list.mockResolvedValue([
      createSignoff(),
      createSignoff({
        id: 10,
        student: { studentId: 251000456, firstName: 'Bo', lastName: 'Chen', email: 'bo@uwo.ca' },
        training: { id: 4, slug: 'cnc', title: 'CNC Router', versionNo: 1 },
        onlinePassedAt: '2026-10-20T16:20:00Z',
      }),
    ]);

    render(<SignoffQueue now={NOW} />);

    expect(await screen.findByText('Alex Smith')).toBeInTheDocument();
    expect(screen.getByText('Student number 251000123')).toBeInTheDocument();
    expect(screen.getByText(/passed online 2 hours ago/i)).toBeInTheDocument();
    expect(screen.getByText('Bo Chen')).toBeInTheDocument();
    expect(screen.getByText(/CNC Router/)).toBeInTheDocument();
    expect(screen.getByText(/passed online 10 minutes ago/i)).toBeInTheDocument();
    expect(screen.getByText('2 students are waiting')).toBeInTheDocument();
  });

  it('opens a student by tapping their card', async () => {
    list.mockResolvedValue([createSignoff({ id: 9 })]);

    render(<SignoffQueue now={NOW} />);

    const link = await screen.findByRole('link', { name: /alex smith/i });
    expect(link).toHaveAttribute('href', '/admin/signoffs/9');
  });

  it('says so when nobody is waiting', async () => {
    list.mockResolvedValue([]);

    render(<SignoffQueue now={NOW} />);

    expect(await screen.findByText(/no one is waiting for a sign-off/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('tells a supervisor which request is their own', async () => {
    list.mockResolvedValue([createSignoff({ ownRequest: true })]);

    render(<SignoffQueue now={NOW} />);

    expect(await screen.findByText(/another supervisor has to sign you off/i)).toBeInTheDocument();
  });

  it('shows an error with a retry when the list cannot be loaded', async () => {
    list.mockRejectedValueOnce(new ApiError('FORBIDDEN'));
    list.mockResolvedValueOnce([createSignoff()]);

    render(<SignoffQueue now={NOW} />);

    expect(await screen.findByText(/permission to sign off/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Alex Smith')).toBeInTheDocument();
  });

  it('refreshes the list on request', async () => {
    list.mockResolvedValueOnce([]);
    list.mockResolvedValueOnce([createSignoff()]);

    render(<SignoffQueue now={NOW} />);
    await screen.findByText(/no one is waiting/i);

    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => expect(screen.getByText('Alex Smith')).toBeInTheDocument());
    expect(list).toHaveBeenCalledTimes(2);
  });
});
