import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { mockSuccessfulLogin, mockFailedLogin } from '@test/utils/authHelpers';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/api/mocks';
import { endpoints } from '@/api/client/endpoints';
import { toast } from 'sonner';
import { LoginForm } from '@/app/(auth)/login/login-form';

// Mock Next.js router
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock sonner toast (needs to be before imports to avoid hoisting issues)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LoginForm Integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
  });

  describe('Form Validation', () => {
    it('validates student ID is required', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      expect(await screen.findByText(/student id is required/i)).toBeInTheDocument();
    });

    it('validates student ID must be exactly 9 digits', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      // Too short
      await user.type(studentIdInput, '12345');
      await user.click(submitButton);

      expect(await screen.findByText(/must be exactly 9 digits/i)).toBeInTheDocument();
    });

    it('validates student ID must be in valid range (251000000-251999999)', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      // Out of range
      await user.type(studentIdInput, '999999999');
      await user.click(submitButton);

      expect(
        await screen.findByText(/must be between 251000000 and 251999999/i),
      ).toBeInTheDocument();
    });

    it('validates student ID with non-numeric characters', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(studentIdInput, 'abc123xyz');
      await user.click(submitButton);

      expect(await screen.findByText(/must be exactly 9 digits/i)).toBeInTheDocument();
    });

    it('validates password is required', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(studentIdInput, '251000001');
      await user.click(submitButton);

      expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    });
  });

  describe('Successful Login', () => {
    it('submits form with valid credentials and redirects to dashboard', async () => {
      const user = userEvent.setup();
      mockSuccessfulLogin();

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Login successful'));
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('clears form errors on successful submission', async () => {
      const user = userEvent.setup();
      mockSuccessfulLogin();

      render(<LoginForm />);

      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      // First submit with invalid data
      await user.click(submitButton);
      expect(await screen.findByText(/student id is required/i)).toBeInTheDocument();

      // Now submit with valid data
      await user.type(studentIdInput, '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/student id is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Failed Login', () => {
    it('shows error toast on invalid credentials', async () => {
      const user = userEvent.setup();
      mockFailedLogin();

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Invalid credentials'));
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('allows retry after failed login', async () => {
      const user = userEvent.setup();

      // First attempt fails
      mockFailedLogin();
      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      // Second attempt succeeds
      mockSuccessfulLogin();

      const passwordInput = screen.getByLabelText(/password/i);
      await user.clear(passwordInput);
      await user.type(passwordInput, 'correctpassword');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();

      mockServer.use(
        http.post('*' + endpoints.auth.login, () => {
          return HttpResponse.error();
        }),
      );

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('disables submit button while loading', async () => {
      const user = userEvent.setup();

      // Delay the response to keep loading state visible
      mockServer.use(
        http.post('*' + endpoints.auth.login, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            success: true,
            data: { sessionToken: 'token' },
          });
        }),
      );

      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /login/i });

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Click and wait for the state to update
      await user.click(submitButton);

      // Wait a bit for React to process the state update
      await waitFor(
        () => {
          expect(submitButton).toBeDisabled();
        },
        { timeout: 1000 },
      );
    });

    it('shows "Logging in..." text while loading', async () => {
      const user = userEvent.setup();

      // Delay the response to keep loading state visible
      mockServer.use(
        http.post('*' + endpoints.auth.login, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            success: true,
            data: { sessionToken: 'token' },
          });
        }),
      );

      render(<LoginForm />);

      await user.type(screen.getByLabelText(/student id/i), '251000001');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      // Should show loading text
      expect(screen.getByText(/logging in/i)).toBeInTheDocument();
    });
  });

  describe('UI Elements', () => {
    it('displays "Forgot password" link', () => {
      render(<LoginForm />);

      const forgotPasswordLink = screen.getByText(/forgot your password/i);
      expect(forgotPasswordLink).toBeInTheDocument();
      expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
    });

    it('displays "Sign up" link', () => {
      render(<LoginForm />);

      const signupLink = screen.getByText(/sign up/i);
      expect(signupLink).toBeInTheDocument();
      expect(signupLink.closest('a')).toHaveAttribute('href', '/signup');
    });

    it('renders password input with type="password"', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });
});
