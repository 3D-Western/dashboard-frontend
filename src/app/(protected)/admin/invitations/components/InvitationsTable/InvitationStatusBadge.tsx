import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Badge } from '@/components/ui/badge';
import { InvitationStatus } from '@/types/invitation';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva('border-transparent transition-colors', {
  variants: {
    status: {
      PENDING: 'bg-status-in-queue text-status-in-queue-foreground',
      ACCEPTED: 'bg-status-success text-status-success-foreground',
      EXPIRED: 'bg-status-flagged text-status-flagged-foreground',
      REVOKED: 'bg-status-error text-status-error-foreground',
    },
  },
});

const mapInvitationStatusToDisplayLabel = (status: InvitationStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'ACCEPTED':
      return 'Accepted';
    case 'EXPIRED':
      return 'Expired';
    case 'REVOKED':
      return 'Revoked';
    default:
      return 'Unknown';
  }
};

export interface InvitationStatusBadgeProps
  extends
    Omit<React.ComponentProps<typeof Badge>, 'variant'>,
    VariantProps<typeof statusBadgeVariants> {
  status: InvitationStatus;
}

export function InvitationStatusBadge({ status, className, ...props }: InvitationStatusBadgeProps) {
  const displayLabel = mapInvitationStatusToDisplayLabel(status);

  return (
    <Badge
      className={cn(statusBadgeVariants({ status }), className)}
      role="status"
      aria-label={`Invitation status: ${displayLabel}`}
      {...props}
    >
      {displayLabel}
    </Badge>
  );
}
