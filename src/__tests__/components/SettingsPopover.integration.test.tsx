import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import { SettingsPopover } from '@/components/SettingsPopover';

const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/auth', () => ({
  logout: () => mockLogout(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/ui/popover', () => {
  const PopoverContext = React.createContext<{
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  } | null>(null);

  const Popover = ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => {
    return (
      <PopoverContext.Provider value={{ open, onOpenChange }}>{children}</PopoverContext.Provider>
    );
  };

  const PopoverTrigger = ({
    asChild,
    children,
  }: {
    asChild?: boolean;
    children: React.ReactNode;
  }) => {
    const ctx = React.useContext(PopoverContext);
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<React.ComponentProps<'button'>>;
      return React.cloneElement(child, {
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
          if (child.props.onClick) {
            child.props.onClick(event);
          }
          ctx?.onOpenChange?.(!ctx.open);
        },
      });
    }
    return (
      <button onClick={() => ctx?.onOpenChange?.(!ctx.open)} type="button">
        {children}
      </button>
    );
  };

  const PopoverContent = ({ children }: { children: React.ReactNode }) => {
    const ctx = React.useContext(PopoverContext);
    if (!ctx?.open) return null;
    return <div>{children}</div>;
  };

  return { Popover, PopoverContent, PopoverTrigger };
});

describe('SettingsPopover', () => {
  it('closes the popover when navigating to settings', async () => {
    const user = userEvent.setup();
    render(<SettingsPopover />);

    await user.click(screen.getByRole('button', { name: /settings/i }));

    const settingsLink = screen.getByRole('link', { name: /^settings$/i });
    expect(settingsLink).toBeInTheDocument();

    await user.click(settingsLink);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
    });
  });
});
