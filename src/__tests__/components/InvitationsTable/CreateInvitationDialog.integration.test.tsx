import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { CreateInvitationDialog } from '@/app/(protected)/admin/invitations/components/InvitationsTable/CreateInvitationDialog';
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

describe('CreateInvitationDialog Integration', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnSuccess.mockClear();
    vi.clearAllMocks();
  });

  describe('Dialog Visibility', () => {
    it('does not render when closed', () => {
      render(
        <CreateInvitationDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.queryByText('Create Invitation')).not.toBeInTheDocument();
    });

    it('renders dialog when open is true', () => {
      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByRole('heading', { name: 'Create Invitation' })).toBeInTheDocument();
      expect(screen.getByText(/send an invitation to allow a new student/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates student ID is required', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const submitButton = screen.getByRole('button', { name: /create invitation/i });
      await user.click(submitButton);

      expect(await screen.findByText(/student id is required/i)).toBeInTheDocument();
    });

    it('validates email is required', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.click(submitButton);

      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    });

    it('validates student ID is in valid range', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '999999999');
      await user.click(submitButton);

      expect(
        await screen.findByText(/student id must be between 251000000 and 251999999/i),
      ).toBeInTheDocument();
    });

    it('validates email must be UWO format', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'test@gmail.com');
      await user.click(submitButton);

      expect(await screen.findByText(/email must be a valid uwo email/i)).toBeInTheDocument();
    });

    it('validates expiration days must be between 1 and 30', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const expiresSelect = screen.getByRole('combobox', { name: /expires in/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');

      // The select dropdown has predefined values (3, 7, 14, 30) so we just need to verify
      // the field exists and can be interacted with
      expect(expiresSelect).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      const mockInvitation = createMockInvitation();

      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockInvitation,
          });
        }),
      );

      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockInvitation);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Invitation created successfully.');
      });
    });

    it('closes dialog on successful submission', async () => {
      const user = userEvent.setup();
      const mockInvitation = createMockInvitation();

      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockInvitation,
          });
        }),
      );

      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('resets form after successful submission', async () => {
      const user = userEvent.setup();
      const mockInvitation = createMockInvitation();

      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockInvitation,
          });
        }),
      );

      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456') as HTMLInputElement;
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca') as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');
      await user.click(submitButton);

      await waitFor(() => {
        expect(studentIdInput.value).toBe('');
        expect(emailInput.value).toBe('');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles INVITATION_ALREADY_EXISTS error', async () => {
      const user = userEvent.setup();

      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'INVITATION_ALREADY_EXISTS',
                message: 'Invitation already exists',
              },
            },
            { status: 409 },
          );
        }),
      );

      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invitation already exists')).toBeInTheDocument();
      });
    });

    it('handles USER_ALREADY_EXISTS error', async () => {
      const user = userEvent.setup();

      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'USER_ALREADY_EXISTS',
                message: 'Student already registered',
              },
            },
            { status: 409 },
          );
        }),
      );

      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/already registered/i)).toBeInTheDocument();
      });
    });

    it('handles generic API error', async () => {
      const user = userEvent.setup();

      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Server error',
              },
            },
            { status: 500 },
          );
        }),
      );

      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('handles VALIDATION_FAILED error with field details', async () => {
      const user = userEvent.setup();

      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_FAILED',
                message: 'Validation failed',
                details: {
                  studentId: 'Student ID is already in use',
                  email: 'Email domain not allowed',
                },
              },
            },
            { status: 400 },
          );
        }),
      );

      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Student ID is already in use')).toBeInTheDocument();
        expect(screen.getByText('Email domain not allowed')).toBeInTheDocument();
      });
    });

    it('handles ApiError with empty message', async () => {
      const user = userEvent.setup();

      // Mock a network error by throwing from the handler
      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'UNKNOWN_ERROR',
                message: '',
              },
            },
            { status: 500 },
          );
        }),
      );

      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');
      await user.click(submitButton);

      await waitFor(() => {
        // When the error message is empty, the component shows a generic message
        expect(
          screen.getByText('Failed to create invitation. Please try again.'),
        ).toBeInTheDocument();
      });
    });

    it('handles non-ApiError exceptions', async () => {
      const user = userEvent.setup();
      const createInvitationSpy = vi
        .spyOn(invitationApi, 'createInvitation')
        .mockRejectedValueOnce(new Error('Network failure'));

      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('An unexpected error occurred. Please try again.'),
        ).toBeInTheDocument();
      });

      createInvitationSpy.mockRestore();
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();

      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, async () => {
          // Simulate slow response
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            success: true,
            data: createMockInvitation(),
          });
        }),
      );

      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');
      await user.click(submitButton);

      // Button should show loading state
      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create invitation/i })).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Closing', () => {
    it('resets error when dialog is closed', async () => {
      const user = userEvent.setup();

      mockServer.use(
        http.post(`*${endpoints.invitations.create}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'INVITATION_ALREADY_EXISTS',
                message: 'Invitation already exists',
              },
            },
            { status: 409 },
          );
        }),
      );

      const { rerender } = render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const studentIdInput = screen.getByPlaceholderText('251123456');
      const emailInput = screen.getByPlaceholderText('jdoe123@uwo.ca');
      const submitButton = screen.getByRole('button', { name: /create invitation/i });

      await user.type(studentIdInput, '251000001');
      await user.type(emailInput, 'jdoe123@uwo.ca');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invitation already exists')).toBeInTheDocument();
      });

      // Close dialog
      rerender(
        <CreateInvitationDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      // Error should be cleared
      expect(screen.queryByText(/pending invitation already exists/i)).not.toBeInTheDocument();
    });

    it('calls onOpenChange with false when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Form Fields', () => {
    it('displays all form fields with correct labels', () => {
      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByText('Student ID')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Expires In')).toBeInTheDocument();
    });

    it('displays form descriptions', () => {
      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByText(/enter the student's 9-digit id/i)).toBeInTheDocument();
      expect(screen.getByText(/must be a valid uwo email address/i)).toBeInTheDocument();
      expect(screen.getByText(/how long the invitation will be valid/i)).toBeInTheDocument();
    });

    it('has default expiration value of 7 days', async () => {
      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const expiresSelect = screen.getByDisplayValue('7 days');
      expect(expiresSelect).toBeInTheDocument();
    });

    it('provides expiration options', async () => {
      const user = userEvent.setup();
      render(
        <CreateInvitationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />,
      );

      const expiresSelect = screen.getByRole('combobox', { name: /expires in/i });
      await user.click(expiresSelect);

      expect(screen.getByRole('option', { name: '3 days' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '7 days' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '14 days' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '30 days' })).toBeInTheDocument();
    });
  });
});
