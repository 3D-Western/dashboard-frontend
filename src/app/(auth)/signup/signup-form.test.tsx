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

  it('accepts any 9-digit student number and an upper-case uwo email (D-5 open signup)', async () => {
    render(<SignupForm />);

    await userEvent.type(screen.getByLabelText(/student id/i), '100000001');
    await userEvent.type(screen.getByLabelText(/uwo email/i), 'JDoe2@UWO.ca');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Other required fields are blank, so their errors show up in the same pass. Wait for one of them.
    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.queryByText(/student id must/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/must be a valid uwo email/i)).not.toBeInTheDocument();
  });
});

describe('SignupForm layout', () => {
  it('is one column until lg, and the logo column only shows from lg and never in short landscape', () => {
    const { container } = render(<SignupForm />);

    const form = container.querySelector('form')!;
    const card = form.parentElement!;
    expect(card).toHaveClass('lg:grid-cols-2', 'short:grid-cols-1');
    expect(card.lastElementChild).toHaveClass('hidden', 'lg:block', 'short:hidden');
  });
});

describe('SignupForm with an invitation code (people without a @uwo.ca email)', () => {
  const fillRest = async () => {
    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Roe');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Abcdefghij1');
    await userEvent.click(screen.getByRole('combobox', { name: /faculty/i }));
    await userEvent.click(screen.getAllByRole('option')[0]);
    await userEvent.click(screen.getByRole('combobox', { name: /experience level/i }));
    await userEvent.click(screen.getAllByRole('option')[0]);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides the code field until asked, and keeps the @uwo.ca rule without a code', async () => {
    render(<SignupForm />);

    expect(screen.queryByLabelText(/invitation code/i)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/student id/i), '251000001');
    await userEvent.type(screen.getByLabelText(/uwo email/i), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/must be a valid uwo email/i)).toBeInTheDocument();
    expect(sessionApi.signup).not.toHaveBeenCalled();
  });

  it('shows the code field from the invitation link, filled in with the invited email', () => {
    render(<SignupForm initialInvitationCode="ABC234" initialEmail="jane@example.com" />);

    expect((screen.getByLabelText(/invitation code/i) as HTMLInputElement).value).toBe('ABC234');
    expect((screen.getByLabelText(/^email/i) as HTMLInputElement).value).toBe('jane@example.com');
    // The invitation carries the student number, so it is not asked for
    expect(screen.queryByLabelText(/student id/i)).not.toBeInTheDocument();
  });

  it('lets someone reveal the code field themselves', async () => {
    render(<SignupForm />);

    await userEvent.click(screen.getByRole('button', { name: /i have an invitation code/i }));

    expect(screen.getByLabelText(/invitation code/i)).toBeInTheDocument();
  });

  it('sends the code and no student number, and accepts a non-uwo email', async () => {
    vi.mocked(sessionApi.signup).mockResolvedValue({} as never);
    render(<SignupForm initialInvitationCode="ABC234" initialEmail="Jane@Example.com" />);

    await fillRest();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await vi.waitFor(() => expect(sessionApi.signup).toHaveBeenCalledTimes(1));
    const sent = vi.mocked(sessionApi.signup).mock.calls[0][0];
    expect(sent.invitationCode).toBe('ABC234');
    expect(sent.email).toBe('jane@example.com');
    expect(sent).not.toHaveProperty('studentId');
  });

  it('still rejects a malformed email when a code is entered', async () => {
    render(<SignupForm initialInvitationCode="ABC234" initialEmail="jane@localhost" />);

    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(sessionApi.signup).not.toHaveBeenCalled();
  });

  it('refuses a student number from the reserved range when there is no code', async () => {
    render(<SignupForm />);

    await userEvent.type(screen.getByLabelText(/student id/i), '900000001');
    await userEvent.type(screen.getByLabelText(/uwo email/i), 'jdoe@uwo.ca');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/student id must be exactly 9 digits/i)).toBeInTheDocument();
  });
});
