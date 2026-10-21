import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { AddNonWesternMemberButton } from './AddNonWesternMemberButton';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe('AddNonWesternMemberButton', () => {
  it('opens the dialog with name, email, member type and optional number fields', async () => {
    const user = userEvent.setup();
    render(<AddNonWesternMemberButton />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add a non-western member/i }));

    const dialog = screen.getByRole('dialog', { name: /add a non-western member/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /member type/i })).toBeInTheDocument();
  });
});
