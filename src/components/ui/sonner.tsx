'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          // Success toast colors
          '--success-bg': 'var(--status-success)',
          '--success-text': 'var(--status-success-foreground)',
          '--success-border': 'var(--border)',
          // Error toast colors
          '--error-bg': 'var(--status-error)',
          '--error-text': 'var(--status-error-foreground)',
          '--error-border': 'var(--border)',
          // Warning toast colors
          '--warning-bg': 'var(--status-flagged)',
          '--warning-text': 'var(--status-flagged-foreground)',
          '--warning-border': 'var(--border)',
          // Info toast colors
          '--info-bg': 'var(--status-in-queue)',
          '--info-text': 'var(--status-in-queue-foreground)',
          '--info-border': 'var(--border)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
