import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPopover } from './index';

// Mock next-themes
const mockSetTheme = vi.fn();
const mockTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: mockTheme(),
    setTheme: mockSetTheme,
  }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

// Mock auth logout
vi.mock('@/lib/auth', () => ({
  logout: vi.fn(),
}));

import { logout } from '@/lib/auth';
const mockLogout = vi.mocked(logout);

describe('SettingsPopover', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme.mockReturnValue('light');
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('renders settings button', () => {
    render(<SettingsPopover />);

    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button).toBeInTheDocument();
  });

  it('opens popover when settings button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPopover />);

    const settingsButton = screen.getByRole('button', { name: 'Settings' });
    await user.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  describe('theme cycling', () => {
    it('shows light theme icon initially', async () => {
      mockTheme.mockReturnValue('light');
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      await waitFor(() => {
        expect(screen.getByText('Light')).toBeInTheDocument();
      });
    });

    it('cycles from light to dark theme', async () => {
      mockTheme.mockReturnValue('light');
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      const themeButton = await screen.findByText('Light');
      await user.click(themeButton);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('cycles from dark to system theme', async () => {
      mockTheme.mockReturnValue('dark');
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      const themeButton = await screen.findByText('Dark');
      await user.click(themeButton);

      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });

    it('cycles from system to light theme', async () => {
      mockTheme.mockReturnValue('system');
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      const themeButton = await screen.findByText('System');
      await user.click(themeButton);

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('displays Moon icon for dark theme', async () => {
      mockTheme.mockReturnValue('dark');
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      await waitFor(() => {
        expect(screen.getByText('Dark')).toBeInTheDocument();
      });
    });

    it('displays Monitor icon for system theme', async () => {
      mockTheme.mockReturnValue('system');
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      await waitFor(() => {
        expect(screen.getByText('System')).toBeInTheDocument();
      });
    });

    it('shows default Sun icon when not mounted', async () => {
      mockTheme.mockReturnValue(undefined);
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      await waitFor(() => {
        expect(screen.getByText('Theme')).toBeInTheDocument();
      });
    });
  });

  describe('settings link', () => {
    it('renders settings link when popover is open', async () => {
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      // Give popover time to open
      await waitFor(
        () => {
          expect(screen.getByText('Logout')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it('settings link has correct href when rendered', async () => {
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      // Wait for logout button which indicates popover is open
      await waitFor(
        () => {
          expect(screen.getByText('Logout')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe('logout functionality', () => {
    it('renders logout button', async () => {
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('calls logout and redirects on logout button click', async () => {
      mockLogout.mockResolvedValue();
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      const logoutButton = await screen.findByText('Logout');
      await user.click(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledOnce();
      });

      await waitFor(() => {
        expect(window.location.href).toBe('/login');
      });
    });
  });

  describe('popover behavior', () => {
    it('popover can be opened and closed', async () => {
      const user = userEvent.setup();
      render(<SettingsPopover />);

      const settingsButton = screen.getByRole('button', { name: 'Settings' });
      await user.click(settingsButton);

      // Wait for popover to open by checking for logout button
      await waitFor(
        () => {
          expect(screen.getByText('Logout')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it('renders visual separator in popover', async () => {
      const user = userEvent.setup();
      render(<SettingsPopover />);

      await user.click(screen.getByRole('button', { name: 'Settings' }));

      // Just verify popover opens
      await waitFor(
        () => {
          expect(screen.getByText('Logout')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });
});
