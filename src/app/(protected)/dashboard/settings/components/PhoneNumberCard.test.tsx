import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { userApi } from '@/api/client/user';
import { ApiError } from '@/api/client/errors';
import type { MyProfile } from '@/types/user';
import { PhoneNumberCard } from './PhoneNumberCard';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/api/client/user', () => ({
  userApi: { getMyProfile: vi.fn(), updatePhoneSettings: vi.fn() },
}));

function profile(overrides: Partial<MyProfile> = {}): MyProfile {
  return {
    studentId: 251123456,
    email: 'jdoe123@uwo.ca',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: null,
    smsOptIn: false,
    ...overrides,
  };
}

const consentBox = () =>
  screen.getByRole('checkbox', { name: /text me about my prints and access/i });
const phoneInput = () => screen.getByLabelText(/mobile number/i) as HTMLInputElement;

describe('PhoneNumberCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the phone field as a tel input with tel autocomplete', async () => {
    vi.mocked(userApi.getMyProfile).mockResolvedValue(profile());
    render(<PhoneNumberCard />);

    await screen.findByLabelText(/mobile number/i);
    expect(phoneInput()).toHaveAttribute('type', 'tel');
    expect(phoneInput()).toHaveAttribute('autocomplete', 'tel');
  });

  it('keeps the text consent box unticked and disabled while there is no number', async () => {
    vi.mocked(userApi.getMyProfile).mockResolvedValue(profile());
    render(<PhoneNumberCard />);

    await screen.findByLabelText(/mobile number/i);
    expect(consentBox()).toBeDisabled();
    expect(consentBox()).not.toBeChecked();
    expect(
      screen.getByText(/we'll only text about your prints and access\. reply stop any time\./i),
    ).toBeInTheDocument();
  });

  it('enables the consent box once a number is typed, and saves the normalised number with consent', async () => {
    vi.mocked(userApi.getMyProfile).mockResolvedValue(profile());
    vi.mocked(userApi.updatePhoneSettings).mockResolvedValue(
      profile({ phoneNumber: '+15195551234', smsOptIn: true }),
    );
    render(<PhoneNumberCard />);

    await screen.findByLabelText(/mobile number/i);
    await userEvent.type(phoneInput(), '519-555-1234');
    expect(consentBox()).toBeEnabled();

    await userEvent.click(consentBox());
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(userApi.updatePhoneSettings).toHaveBeenCalledWith({
        phoneNumber: '+15195551234',
        smsOptIn: true,
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('Phone and text settings saved');
  });

  it('clears the tick when the number is cleared, so consent is never sent without a number', async () => {
    vi.mocked(userApi.getMyProfile).mockResolvedValue(
      profile({ phoneNumber: '+15195551234', smsOptIn: true }),
    );
    vi.mocked(userApi.updatePhoneSettings).mockResolvedValue(profile());
    render(<PhoneNumberCard />);

    await screen.findByLabelText(/mobile number/i);
    expect(consentBox()).toBeChecked();

    await userEvent.clear(phoneInput());
    expect(consentBox()).toBeDisabled();
    expect(consentBox()).not.toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() =>
      expect(userApi.updatePhoneSettings).toHaveBeenCalledWith({
        phoneNumber: null,
        smsOptIn: false,
      }),
    );
  });

  it('starts unticked when a saved number is replaced, and needs a fresh tick for the new number', async () => {
    vi.mocked(userApi.getMyProfile).mockResolvedValue(
      profile({ phoneNumber: '+15195551234', smsOptIn: true }),
    );
    vi.mocked(userApi.updatePhoneSettings).mockResolvedValue(
      profile({ phoneNumber: '+14165550000', smsOptIn: true }),
    );
    render(<PhoneNumberCard />);

    await screen.findByLabelText(/mobile number/i);
    await userEvent.clear(phoneInput());
    await userEvent.type(phoneInput(), '416-555-0000');
    expect(consentBox()).toBeEnabled();
    expect(consentBox()).not.toBeChecked();

    await userEvent.click(consentBox());
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(userApi.updatePhoneSettings).toHaveBeenCalledWith({
        phoneNumber: '+14165550000',
        smsOptIn: true,
      }),
    );
  });

  it('restores the saved consent when the saved number is typed back in', async () => {
    vi.mocked(userApi.getMyProfile).mockResolvedValue(
      profile({ phoneNumber: '+15195551234', smsOptIn: true }),
    );
    render(<PhoneNumberCard />);

    await screen.findByLabelText(/mobile number/i);
    await userEvent.clear(phoneInput());
    expect(consentBox()).not.toBeChecked();

    await userEvent.type(phoneInput(), '519-555-1234');

    expect(consentBox()).toBeChecked();
  });

  it('keeps the tick while the saved number is left unchanged', async () => {
    vi.mocked(userApi.getMyProfile).mockResolvedValue(
      profile({ phoneNumber: '+15195551234', smsOptIn: true }),
    );
    render(<PhoneNumberCard />);

    await screen.findByLabelText(/mobile number/i);
    await userEvent.type(phoneInput(), ' ');

    expect(phoneInput()).toHaveValue('+15195551234 ');
    expect(consentBox()).toBeChecked();
  });

  it('shows a server message beside the field it belongs to', async () => {
    vi.mocked(userApi.getMyProfile).mockResolvedValue(profile({ phoneNumber: '+15195551234' }));
    vi.mocked(userApi.updatePhoneSettings).mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Add a phone number before turning on text messages.', {
        smsOptIn: 'Add a phone number before turning on text messages.',
      }),
    );
    render(<PhoneNumberCard />);

    await screen.findByLabelText(/mobile number/i);
    await userEvent.click(consentBox());
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(
      await screen.findByText('Add a phone number before turning on text messages.'),
    ).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('offers a retry when the settings cannot be loaded', async () => {
    vi.mocked(userApi.getMyProfile)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(profile({ phoneNumber: '+15195551234' }));
    render(<PhoneNumberCard />);

    expect(
      await screen.findByText(/unable to load your mobile number settings/i),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByLabelText(/mobile number/i)).toHaveValue('+15195551234');
    expect(userApi.getMyProfile).toHaveBeenCalledTimes(2);
  });
});
