import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Badge } from '@/components/ui/badge';
import { PendingRequest } from '@/types/booking';
import { cn } from '@/lib/utils';

const urgencyBadgeVariants = cva('border-transparent transition-colors', {
  variants: {
    urgency: {
      High: 'bg-status-error text-status-error-foreground',
      Medium: 'bg-status-flagged text-status-flagged-foreground',
      Low: 'bg-status-in-queue text-status-in-queue-foreground',
    },
  },
});

export interface UrgencyBadgeProps
  extends
    Omit<React.ComponentProps<typeof Badge>, 'variant'>,
    VariantProps<typeof urgencyBadgeVariants> {
  urgency: PendingRequest['urgencyLevel'];
}

export function UrgencyBadge({ urgency, className, ...props }: UrgencyBadgeProps) {
  return (
    <Badge
      className={cn(urgencyBadgeVariants({ urgency }), 'rounded-full', className)}
      role="status"
      aria-label={`Urgency: ${urgency}`}
      {...props}
    >
      {urgency} Urgency
    </Badge>
  );
}
