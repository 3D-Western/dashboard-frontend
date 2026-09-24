import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Badge } from '@/components/ui/badge';
import { AccountStatus } from '@/types/user';
import { cn } from '@/lib/utils';

// Banned reuses the muted "cancelled" token rather than red — Suspended already uses red
// (status-error), and this codebase's red token is shared/identical to status-fail, so Banned
// needs its own color to stay visually distinct as the most severe, terminal state.
const statusBadgeVariants = cva('border-transparent transition-colors', {
  variants: {
    status: {
      Active: 'bg-status-success text-status-success-foreground',
      Locked: 'bg-status-flagged text-status-flagged-foreground',
      Suspended: 'bg-status-error text-status-error-foreground',
      Banned: 'bg-status-cancelled text-status-cancelled-foreground',
    },
  },
});

const mapAccountStatusToDisplayLabel = (status: AccountStatus): string => status;

export interface AccountStatusBadgeProps
  extends
    Omit<React.ComponentProps<typeof Badge>, 'variant'>,
    VariantProps<typeof statusBadgeVariants> {
  status: AccountStatus;
}

export function AccountStatusBadge({ status, className, ...props }: AccountStatusBadgeProps) {
  const displayLabel = mapAccountStatusToDisplayLabel(status);

  return (
    <Badge
      className={cn(statusBadgeVariants({ status }), className)}
      role="status"
      aria-label={`Account status: ${displayLabel}`}
      {...props}
    >
      {displayLabel}
    </Badge>
  );
}
