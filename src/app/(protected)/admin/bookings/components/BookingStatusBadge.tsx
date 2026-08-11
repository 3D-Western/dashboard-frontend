import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Badge } from '@/components/ui/badge';
import { BookingStatus } from '@/types/booking';
import { cn } from '@/lib/utils';

const bookingStatusBadgeVariants = cva('border-transparent transition-colors', {
  variants: {
    status: {
      APPROVED: 'bg-status-success text-status-success-foreground',
      PENDING: 'bg-status-in-queue text-status-in-queue-foreground',
      REJECTED: 'bg-status-error text-status-error-foreground',
      CANCELLED: 'bg-status-flagged text-status-flagged-foreground',
    },
  },
});

export interface BookingStatusBadgeProps
  extends
    Omit<React.ComponentProps<typeof Badge>, 'variant'>,
    VariantProps<typeof bookingStatusBadgeVariants> {
  status: BookingStatus;
}

export function BookingStatusBadge({ status, className, ...props }: BookingStatusBadgeProps) {
  return (
    <Badge
      className={cn(bookingStatusBadgeVariants({ status }), className)}
      role="status"
      aria-label={`Booking status: ${status}`}
      {...props}
    >
      {status}
    </Badge>
  );
}
