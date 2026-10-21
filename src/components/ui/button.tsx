import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primary = the website's gradient button; secondary/outline = the website's outlined button
        default: 'btn text-white',
        outline:
          'border-primary-text/18 text-primary-text hover:border-purple-light hover:bg-purple-light/10 aria-expanded:border-purple-light aria-expanded:bg-purple-light/10',
        secondary:
          'border-primary-text/18 text-primary-text hover:border-purple-light hover:bg-purple-light/10 aria-expanded:border-purple-light aria-expanded:bg-purple-light/10',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        link: 'text-primary underline-offset-4 hover:underline',
        // Website (website-2.0) variants
        outlined:
          'border-primary-text/18 text-primary-text hover:border-purple-light hover:bg-purple-light/10',
        gradient: 'btn text-white',
      },
      size: {
        // Phones get 44 px buttons (easier to tap); from md up they're the original sizes.
        // The two heights live in a CSS variable behind ONE height class, so a caller's own
        // height (h-auto, h-6, ...) replaces it on every screen size instead of only on phones.
        default:
          'h-[var(--btn-h)] gap-1.5 px-2.5 [--btn-h:2.75rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 md:[--btn-h:2rem]',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[var(--btn-h)] gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] [--btn-h:2.75rem] md:[--btn-h:1.75rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-[var(--btn-h)] gap-1.5 px-2.5 [--btn-h:2.75rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 md:[--btn-h:2.25rem]',
        icon: 'size-[var(--btn-h)] [--btn-h:2.75rem] md:[--btn-h:2rem]',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-[var(--btn-h)] rounded-[min(var(--radius-md),12px)] [--btn-h:2.75rem] in-data-[slot=button-group]:rounded-lg md:[--btn-h:1.75rem]',
        'icon-lg': 'size-[var(--btn-h)] [--btn-h:2.75rem] md:[--btn-h:2.25rem]',
        // Website (website-2.0) size
        pill: 'h-[var(--btn-h)] gap-2 rounded-lg px-5 font-semibold [--btn-h:2.75rem] has-[>svg:first-child]:pl-4 sm:[--btn-h:2.5rem]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
