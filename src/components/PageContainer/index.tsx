import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps extends ComponentProps<'div'> {
  /** Single-column forms and checklists: 48rem (768 px) instead of 72rem. */
  narrow?: boolean;
}

/**
 * The width of a page's content: centred, and capped so cards do not stretch across a 1920 px
 * screen. Below the cap it fills the space the layout gives it, so phones and laptops are
 * unchanged. Padding and spacing stay with the caller (`className`).
 */
export function PageContainer({ narrow = false, className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full', narrow ? 'max-w-3xl' : 'max-w-6xl', className)}
      {...props}
    />
  );
}
