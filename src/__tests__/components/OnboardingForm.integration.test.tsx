import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { OnboardingForm } from '@/app/(onboarding)/onboarding/onboarding-form';
import { useOnboardingStatus } from '@/hooks/useOnboarding';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/useOnboarding', () => ({
  useOnboardingStatus: vi.fn(),
}));

const setupUser = () => userEvent.setup({ pointerEventsCheck: 0 });

const selectComboboxOption = async (
  user: ReturnType<typeof setupUser>,
  trigger: HTMLElement,
  label: string,
) => {
  await user.click(trigger);
  const listbox = await screen.findByRole('listbox');
  const option = within(listbox).getByRole('option', { name: label });
  await user.click(option);
};

describe('OnboardingForm Integration', () => {
  const submitOnboarding = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useOnboardingStatus as ReturnType<typeof vi.fn>).mockReturnValue({
      onboardingCompleted: false,
      isLoading: false,
      isSubmitting: false,
      error: null,
      refetch: vi.fn(),
      submitOnboarding,
    });
  });

  it('defaults to Affiliation=Undergraduate and shows Faculty, Program, Year', () => {
    render(<OnboardingForm />);

    expect(screen.getByLabelText(/Faculty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Program$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Year$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Department/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Master's\/PhD/i)).not.toBeInTheDocument();
  });

  it('shows Department only when Affiliation=Staff', async () => {
    const user = setupUser();
    render(<OnboardingForm />);

    const affiliationTrigger = screen.getAllByRole('combobox')[0];
    await selectComboboxOption(user, affiliationTrigger, 'Staff');

    expect(screen.getByLabelText(/Department/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Faculty$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Year$/i)).not.toBeInTheDocument();
  });

  it("shows Master's/PhD instead of Year when Affiliation=Graduate", async () => {
    const user = setupUser();
    render(<OnboardingForm />);

    const affiliationTrigger = screen.getAllByRole('combobox')[0];
    await selectComboboxOption(user, affiliationTrigger, 'Graduate');

    expect(screen.getByLabelText(/Faculty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Master's\/PhD/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Year$/i)).not.toBeInTheDocument();
  });

  it('clears stale conditional fields when Affiliation changes away and back', async () => {
    const user = setupUser();
    render(<OnboardingForm />);

    await user.type(screen.getByLabelText(/^Program$/i), 'Software Engineering');
    expect(screen.getByLabelText(/^Program$/i)).toHaveValue('Software Engineering');

    const affiliationTrigger = screen.getAllByRole('combobox')[0];
    await selectComboboxOption(user, affiliationTrigger, 'Alumni');
    expect(screen.queryByLabelText(/^Program$/i)).not.toBeInTheDocument();

    await selectComboboxOption(user, screen.getAllByRole('combobox')[0], 'Undergraduate');
    expect(screen.getByLabelText(/^Program$/i)).toHaveValue('');
  });

  it('blocks submission and shows errors when agreements are unchecked', async () => {
    const user = setupUser();
    render(<OnboardingForm />);

    await user.click(screen.getByRole('button', { name: /Finish & Go to Dashboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/You must agree to the Terms of Service/i)).toBeInTheDocument();
    });
    expect(submitOnboarding).not.toHaveBeenCalled();
  });

  it('submits successfully once required fields and agreements are filled', async () => {
    const user = setupUser();
    submitOnboarding.mockResolvedValue(undefined);
    render(<OnboardingForm />);

    await selectComboboxOption(user, screen.getAllByRole('combobox')[1], 'Engineering');
    await user.type(screen.getByLabelText(/^Program$/i), 'Software Engineering');
    await selectComboboxOption(user, screen.getAllByRole('combobox')[2], 'Year 2');

    const interestCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(interestCheckbox);

    await selectComboboxOption(user, screen.getAllByRole('combobox')[3], 'Friend');
    await selectComboboxOption(user, screen.getAllByRole('combobox')[4], 'Just Exploring');

    const agreementCheckboxes = screen.getAllByRole('checkbox').slice(-3);
    for (const checkbox of agreementCheckboxes) {
      await user.click(checkbox);
    }

    await user.click(screen.getByRole('button', { name: /Finish & Go to Dashboard/i }));

    await waitFor(() => {
      expect(submitOnboarding).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
