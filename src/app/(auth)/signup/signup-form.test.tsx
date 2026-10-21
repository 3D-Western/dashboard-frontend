import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sessionApi } from '@/api/client/session';
import { SignupForm } from './signup-form';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/api/client/session', () => ({
  sessionApi: { signup: vi.fn() },
}));

const phoneInput = () => screen.getByLabelText(/mobile number/i) as HTMLInputElement;
const consentBox = () =>
  screen.getByRole('checkbox', { name: /text me about my prints and access/i });

describe('SignupForm phone number and text consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers an optional tel field with tel autocomplete', () => {
    render(<SignupForm />);

    expect(phoneInput()).toHaveAttribute('type', 'tel');
    expect(phoneInput()).toHaveAttribute('autocomplete', 'tel');
    expect(phoneInput().value).toBe('');
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('starts with text consent unticked and disabled', () => {
    render(<SignupForm />);

    expect(consentBox()).not.toBeChecked();
    expect(consentBox()).toBeDisabled();
    expect(screen.getByText(/add a phone number to turn this on/i)).toBeInTheDocument();
  });

  it('enables the consent box once a number is typed', async () => {
    render(<SignupForm />);

    await userEvent.type(phoneInput(), '519-555-1234');

    expect(consentBox()).toBeEnabled();
    expect(consentBox()).not.toBeChecked();
    expect(screen.queryByText(/add a phone number to turn this on/i)).not.toBeInTheDocument();
  });

  it('unticks and disables consent again when the number is cleared', async () => {
    render(<SignupForm />);

    await userEvent.type(phoneInput(), '519-555-1234');
    await userEvent.click(consentBox());
    expect(consentBox()).toBeChecked();

    await userEvent.clear(phoneInput());

    expect(consentBox()).toBeDisabled();
    expect(consentBox()).not.toBeChecked();
  });

  it('does not call the API when a typed number is invalid', async () => {
    render(<SignupForm />);

    await userEvent.type(phoneInput(), '12345');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/10-digit North American phone number/i)).toBeInTheDocument();
    expect(sessionApi.signup).not.toHaveBeenCalled();
  });
});
