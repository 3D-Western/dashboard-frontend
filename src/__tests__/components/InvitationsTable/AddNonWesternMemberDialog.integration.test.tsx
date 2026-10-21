import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { AddNonWesternMemberDialog } from '@/app/(protected)/admin/users/components/AddNonWesternMemberDialog';
import { createMockInvitation } from '@test/utils/mockFactories';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { endpoints } from '@/api/client/endpoints';
import { toast } from 'sonner';
import { invitationApi } from '@/api/client/invitation';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AddNonWesternMemberDialog', () => {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderOpen = () =>
    render(
      <AddNonWesternMemberDialog open={true} onOpenChange={onOpenChange} onSuccess={onSuccess} />,
    );

  const chooseMemberType = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
    await user.click(screen.getByRole('combobox', { name: /member type/i }));
    await user.click(screen.getByRole('option', { name: label }));
  };

  const fillValid = async (
    user: ReturnType<typeof userEvent.setup>,
    { studentId = '' }: { studentId?: string } = {},
  ) => {
    await user.type(screen.getByLabelText(/first name/i), 'Jane');
    await user.type(screen.getByLabelText(/last name/i), 'Roe');
    await user.type(screen.getByLabelText(/^email/i), 'Jane@Example.com');
    await chooseMemberType(user, 'Alumni');
    if (studentId)
      await user.type(screen.getByLabelText(/western student or staff number/i), studentId);
  };

  const submit = (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: /send invitation/i }));

  describe('Dialog', () => {
    it('does not render when closed', () => {
      render(<AddNonWesternMemberDialog open={false} onOpenChange={onOpenChange} />);
      expect(screen.queryByText('Add a non-Western member')).not.toBeInTheDocument();
    });

    it('asks for name, email (any domain), member type and an optional Western number', () => {
      renderOpen();

      expect(screen.getByRole('heading', { name: 'Add a non-Western member' })).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /member type/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/western student or staff number/i)).toBeInTheDocument();
      expect(screen.getByText('(optional)')).toBeInTheDocument();
      expect(screen.getByText(/starting at 900000000/i)).toBeInTheDocument();
    });

    it('offers staff, alumni, community and organisation', async () => {
      const user = userEvent.setup();
      renderOpen();

      await user.click(screen.getByRole('combobox', { name: /member type/i }));

      for (const label of ['Staff', 'Alumni', 'Community', 'Organisation']) {
        expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
      }
    });

    it('defaults the invitation to 7 days and offers other lengths', async () => {
      const user = userEvent.setup();
      renderOpen();

      expect(screen.getByDisplayValue('7 days')).toBeInTheDocument();
      await user.click(screen.getByRole('combobox', { name: /valid for/i }));
      expect(screen.getByRole('option', { name: '30 days' })).toBeInTheDocument();
    });

    it('closes from Cancel', async () => {
      const user = userEvent.setup();
      renderOpen();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Validation', () => {
    it('requires names, email and a member type', async () => {
      const user = userEvent.setup();
      renderOpen();

      await submit(user);

      expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getAllByText(/choose a member type/i)).toHaveLength(2); // placeholder + message
    });

    it('accepts any email domain but not a malformed address', async () => {
      const user = userEvent.setup();
      renderOpen();

      await user.type(screen.getByLabelText(/^email/i), 'jane@localhost');
      await submit(user);

      expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    });

    it('refuses a Western number that is not 9 digits', async () => {
      const user = userEvent.setup();
      renderOpen();

      await user.type(screen.getByLabelText(/western student or staff number/i), '12345');
      await submit(user);

      expect(await screen.findByText(/exactly 9 digits/i)).toBeInTheDocument();
    });

    it('refuses a number from the reserved range', async () => {
      const user = userEvent.setup();
      renderOpen();

      await user.type(screen.getByLabelText(/western student or staff number/i), '900000001');
      await submit(user);

      expect(await screen.findByText(/900000000 up are reserved/i)).toBeInTheDocument();
    });

    it('sends nothing while the form is invalid', async () => {
      const user = userEvent.setup();
      const spy = vi.spyOn(invitationApi, 'createInvitation');
      renderOpen();

      await submit(user);

      await screen.findByText(/first name is required/i);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('Sending', () => {
    it('sends name, lower-cased email and member type, and leaves the number out when empty', async () => {
      const user = userEvent.setup();
      let body: Record<string, unknown> | undefined;
      const invitation = createMockInvitation({ email: 'jane@example.com' });
      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ success: true, data: invitation });
        }),
      );
      renderOpen();

      await fillValid(user);
      await submit(user);

      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(invitation));
      expect(body).toEqual({
        firstName: 'Jane',
        lastName: 'Roe',
        email: 'jane@example.com',
        memberType: 'ALUMNI',
        expiresInDays: 7,
      });
      expect(body).not.toHaveProperty('studentId');
      expect(toast.success).toHaveBeenCalledWith('Invitation sent to jane@example.com.');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('sends a typed Western number', async () => {
      const user = userEvent.setup();
      let body: Record<string, unknown> | undefined;
      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ success: true, data: createMockInvitation() });
        }),
      );
      renderOpen();

      await fillValid(user, { studentId: '251123456' });
      await submit(user);

      await waitFor(() => expect(body).toBeDefined());
      expect(body?.studentId).toBe(251123456);
    });

    it('clears the form after sending', async () => {
      const user = userEvent.setup();
      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, () =>
          HttpResponse.json({ success: true, data: createMockInvitation() }),
        ),
      );
      renderOpen();

      await fillValid(user);
      await submit(user);

      await waitFor(() => {
        expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe('');
        expect((screen.getByLabelText(/^email/i) as HTMLInputElement).value).toBe('');
      });
    });

    it('shows a sending state', async () => {
      const user = userEvent.setup();
      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({ success: true, data: createMockInvitation() });
        }),
      );
      renderOpen();

      await fillValid(user);
      await submit(user);

      expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument(),
      );
    });
  });

  describe('Errors', () => {
    const failWith = (status: number, code: string, message: string, details?: unknown) =>
      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, () =>
          HttpResponse.json({ success: false, error: { code, message, details } }, { status }),
        ),
      );

    it('shows a pending-invitation clash', async () => {
      const user = userEvent.setup();
      failWith(409, 'INVITATION_ALREADY_EXISTS', 'A pending invitation already exists for email x');
      renderOpen();

      await fillValid(user);
      await submit(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A pending invitation already exists',
      );
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it('shows when the person already has an account', async () => {
      const user = userEvent.setup();
      failWith(409, 'USER_ALREADY_EXISTS', 'User with email jane@example.com already exists');
      renderOpen();

      await fillValid(user);
      await submit(user);

      expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    });

    it('shows server field errors beside the field', async () => {
      const user = userEvent.setup();
      failWith(400, 'VALIDATION_FAILED', 'Validation failed', {
        email: 'Email must be a valid email address',
        studentId: 'Student number must be 9 digits',
      });
      renderOpen();

      await fillValid(user);
      await submit(user);

      expect(await screen.findByText('Email must be a valid email address')).toBeInTheDocument();
      expect(screen.getByText('Student number must be 9 digits')).toBeInTheDocument();
    });

    it('falls back to a plain message when the server gives none', async () => {
      const user = userEvent.setup();
      failWith(500, 'UNKNOWN_ERROR', '');
      renderOpen();

      await fillValid(user);
      await submit(user);

      expect(
        await screen.findByText('Failed to send the invitation. Please try again.'),
      ).toBeInTheDocument();
    });

    it('handles a network failure', async () => {
      const user = userEvent.setup();
      const spy = vi
        .spyOn(invitationApi, 'createInvitation')
        .mockRejectedValueOnce(new Error('Network failure'));
      renderOpen();

      await fillValid(user);
      await submit(user);

      expect(
        await screen.findByText('An unexpected error occurred. Please try again.'),
      ).toBeInTheDocument();
      spy.mockRestore();
    });
  });
});
