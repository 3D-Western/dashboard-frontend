import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Badge } from '@/components/ui/badge';
import { PrintJobStatus } from '@/types/jobs';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva('border-transparent transition-colors', {
  variants: {
    status: {
      InQueue: 'bg-status-in-queue text-status-in-queue-foreground',
      Printing: 'bg-status-printing text-status-printing-foreground',
      Ready: 'bg-status-ready text-status-ready-foreground',
      Flagged: 'bg-status-flagged text-status-flagged-foreground',
      Error: 'bg-status-error text-status-error-foreground',
      Succeeded: 'bg-status-success text-status-success-foreground',
      Failed: 'bg-status-fail text-status-fail-foreground',
      Cancelled: 'bg-status-cancelled text-status-cancelled-foreground',
      PendingFile: 'bg-status-draft text-status-draft-foreground',
    },
  },
});

const mapPrintJobStatusToDisplayLabel = (status: PrintJobStatus): string => {
  switch (status) {
    case 'InQueue':
      return 'In Queue';
    case 'Printing':
      return 'Printing';
    case 'Ready':
      return 'Ready';
    case 'Flagged':
      return 'Flagged';
    case 'Error':
      return 'Error';
    case 'Succeeded':
      return 'Succeeded';
    case 'Failed':
      return 'Failed';
    case 'Cancelled':
      return 'Cancelled';
    case 'PendingFile':
      return 'Pending File';
    default:
      return 'Unknown';
  }
};

export interface PrintJobStatusBadgeProps
  extends
    Omit<React.ComponentProps<typeof Badge>, 'variant'>,
    VariantProps<typeof statusBadgeVariants> {
  status: PrintJobStatus;
}

export function PrintJobStatusBadge({ status, className, ...props }: PrintJobStatusBadgeProps) {
  const displayLabel = mapPrintJobStatusToDisplayLabel(status);

  return (
    <Badge
      className={cn(statusBadgeVariants({ status }), className)}
      role="status"
      aria-label={`Print job status: ${displayLabel}`}
      {...props}
    >
      {displayLabel}
    </Badge>
  );
}
