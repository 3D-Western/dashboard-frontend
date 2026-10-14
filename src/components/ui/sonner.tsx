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
          // Coloured toasts: the status colour mixed into the (opaque) popover colour, so the page
          // behind never shows through and the text stays readable
          '--success-bg': 'color-mix(in srgb, var(--status-purple) 22%, var(--popover))',
          '--success-text': 'var(--status-purple-foreground)',
          '--success-border': 'color-mix(in srgb, var(--status-purple) 50%, var(--popover))',
          '--error-bg': 'color-mix(in srgb, var(--status-red) 22%, var(--popover))',
          '--error-text': 'var(--status-red-foreground)',
          '--error-border': 'color-mix(in srgb, var(--status-red) 50%, var(--popover))',
          '--warning-bg': 'color-mix(in srgb, var(--status-yellow) 22%, var(--popover))',
          '--warning-text': 'var(--status-yellow-foreground)',
          '--warning-border': 'color-mix(in srgb, var(--status-yellow) 50%, var(--popover))',
          '--info-bg': 'color-mix(in srgb, var(--status-blue) 22%, var(--popover))',
          '--info-text': 'var(--status-blue-foreground)',
          '--info-border': 'color-mix(in srgb, var(--status-blue) 50%, var(--popover))',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast shadow-lg',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
