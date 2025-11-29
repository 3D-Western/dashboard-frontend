import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Badge } from '@/components/ui/badge';
import { PrintJobStatus } from '@/types/jobs';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva('border-transparent transition-colors', {
  variants: {
    status: {
      DRAFT: 'bg-status-draft text-status-draft-foreground',
      IN_QUEUE: 'bg-status-in-queue text-status-in-queue-foreground',
      PRINTING: 'bg-status-printing text-status-printing-foreground',
      READY: 'bg-status-ready text-status-ready-foreground',
      FLAGGED: 'bg-status-flagged text-status-flagged-foreground',
      ERROR: 'bg-status-error text-status-error-foreground',
      SUCCESS: 'bg-status-success text-status-success-foreground',
      FAIL: 'bg-status-fail text-status-fail-foreground',
      CANCELLED: 'bg-status-flagged text-status-flagged-foreground', // reuse flagged style or customize
    },
  },
});

const mapPrintJobStatusToDisplayLabel = (status: PrintJobStatus): string => {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'IN_QUEUE':
      return 'In Queue';
    case 'PRINTING':
      return 'Printing';
    case 'READY':
      return 'Ready';
    case 'FLAGGED':
      return 'Flagged';
    case 'ERROR':
      return 'Error';
    case 'SUCCESS':
      return 'Success';
    case 'FAIL':
      return 'Failed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

export interface PrintJobStatusBadgeProps
  extends Omit<React.ComponentProps<typeof Badge>, 'variant'>,
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
