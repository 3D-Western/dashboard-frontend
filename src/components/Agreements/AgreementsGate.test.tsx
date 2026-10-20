import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAPI } from '@/api/client/training';
import { createAgreement } from '@test/utils/trainingFactories';
import { AgreementsGate } from './AgreementsGate';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

vi.mock('@/api/client/training', () => ({
  trainingAPI: { acceptAgreement: vi.fn() },
}));

// The logout button has its own tests and needs the session API
vi.mock('@/components/DashboardHeader/LogoutButton', () => ({
  default: () => <button type="button">Logout</button>,
}));

const accept = (trainingAPI as unknown as { acceptAgreement: Mock }).acceptAgreement;

const agreements = [
  createAgreement({
    agreementId: 1,
    title: 'Terms of Service',
    bodyMarkdown: '# Terms\n\nBe kind.',
  }),
  createAgreement({
    agreementId: 2,
    kind: 'LIABILITY_WAIVER',
    title: 'Liability Waiver',
    bodyMarkdown: 'You use the machines at your own risk.',
  }),
];

const itemFor = (title: string) => screen.getByRole('heading', { name: title }).closest('li')!;

beforeEach(() => {
  refresh.mockClear();
  accept.mockResolvedValue({ agreementId: 1, acceptedAt: '2026-10-20T12:00:00Z' });
});

describe('AgreementsGate', () => {
  it('blocks the dashboard: it is a full page with its own heading and no way past until all are accepted', () => {
    render(<AgreementsGate agreements={agreements} />);

    expect(
      screen.getByRole('heading', { level: 1, name: /before you continue/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 agreements left to accept.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue to the dashboard/i })).toBeDisabled();
  });

  it('lets each agreement be read in full', async () => {
    render(<AgreementsGate agreements={agreements} />);
    const waiver = itemFor('Liability Waiver');
    const toggle = within(waiver).getByRole('button', { name: /read the full text/i });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(waiver).getByText(/at your own risk/i)).toBeVisible();
    expect(within(waiver).getByRole('button', { name: /hide the full text/i })).toBeInTheDocument();
  });

  it('has a separate accept for each agreement', async () => {
    render(<AgreementsGate agreements={agreements} />);

    expect(screen.getAllByRole('button', { name: /^i accept the /i })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'I accept the Terms of Service' }));

    await waitFor(() => expect(accept).toHaveBeenCalledTimes(1));
    expect(accept).toHaveBeenCalledWith(1);
    // only that one is done
    expect(within(itemFor('Terms of Service')).getByText('Accepted')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'I accept the Terms of Service' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'I accept the Liability Waiver' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 agreement left to accept.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue to the dashboard/i })).toBeDisabled();
  });

  it('continues to the dashboard only after every agreement is accepted', async () => {
    render(<AgreementsGate agreements={agreements} />);

    await userEvent.click(screen.getByRole('button', { name: 'I accept the Terms of Service' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'I accept the Liability Waiver' }),
    );

    const next = await screen.findByRole('button', { name: /continue to the dashboard/i });
    await waitFor(() => expect(next).toBeEnabled());
    expect(screen.getByText(/all done/i)).toBeInTheDocument();

    await userEvent.click(next);
    expect(refresh).toHaveBeenCalled();
  });

  it('shows a plain message when accepting fails, and keeps the button', async () => {
    accept.mockRejectedValueOnce(new ApiError('REQUEST_FAILED'));
    render(<AgreementsGate agreements={agreements} />);

    await userEvent.click(screen.getByRole('button', { name: 'I accept the Terms of Service' }));

    expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'I accept the Terms of Service' })).toBeEnabled();
  });

  it('reloads to show the newer text when an agreement was superseded', async () => {
    accept.mockRejectedValueOnce(new ApiError('AGREEMENT_SUPERSEDED'));
    render(<AgreementsGate agreements={agreements} />);

    await userEvent.click(screen.getByRole('button', { name: 'I accept the Terms of Service' }));

    expect(await screen.findByText(/newer version of this agreement/i)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it('offers to sign out instead', () => {
    render(<AgreementsGate agreements={agreements} />);

    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
  });

  it('uses singular wording for one agreement', () => {
    render(<AgreementsGate agreements={[agreements[0]]} />);

    expect(screen.getByText(/accept this agreement/i)).toBeInTheDocument();
  });
});
