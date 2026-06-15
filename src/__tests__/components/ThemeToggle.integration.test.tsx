import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '@/components/ThemeToggle';

let theme = 'light';
const setTheme = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme,
    setTheme,
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    theme = 'light';
    setTheme.mockClear();
  });

  it('renders a default label for unknown themes', async () => {
    theme = 'unknown';
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /toggle theme/i })).toBeEnabled();
    });
  });

  it('cycles from light to dark on click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggleButton = await screen.findByRole('button', { name: /light mode/i });
    await user.click(toggleButton);

    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
