'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PrintJob, PrintJobStatus } from '@/types/jobs';
import { jobApi } from '@/api/client/job';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PrintJobStatusBadge } from '@/components/PrintJobStatusBadge';
import { Loader2 } from 'lucide-react';

// Backend-supported statuses (excludes PendingFile which is frontend-only)
const BACKEND_STATUSES: PrintJobStatus[] = [
  'InQueue',
  'Printing',
  'Ready',
  'Flagged',
  'Error',
  'Succeeded',
  'Failed',
];

const STATUS_DISPLAY_LABELS: Record<PrintJobStatus, string> = {
  InQueue: 'In Queue',
  Printing: 'Printing',
  Ready: 'Ready',
  Flagged: 'Flagged',
  Error: 'Error',
  Succeeded: 'Succeeded',
  Failed: 'Failed',
  PendingFile: 'Pending File',
};

interface ChangeStatusDialogProps {
  printJob: PrintJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged?: (jobId: string, newStatus: PrintJobStatus) => void;
}

export function ChangeStatusDialog({
  printJob,
  open,
  onOpenChange,
  onStatusChanged,
}: ChangeStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<PrintJobStatus>(printJob.status);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync selectedStatus when dialog opens or printJob.status changes
  useEffect(() => {
    if (open) {
      setSelectedStatus(printJob.status);
    }
  }, [open, printJob.status]);

  const handleConfirm = async () => {
    if (selectedStatus === printJob.status) {
      onOpenChange(false);
      return;
    }

    setIsUpdating(true);
    try {
      await jobApi.updateJobStatus(printJob.id, selectedStatus);

      toast.success('Status updated successfully', {
        description: `Order "${printJob.name}" status changed to ${STATUS_DISPLAY_LABELS[selectedStatus]}`,
      });

      // Notify parent component to update the table
      onStatusChanged?.(printJob.id, selectedStatus);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status', {
        description:
          error instanceof Error ? error.message : 'An error occurred while updating the status',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setSelectedStatus(printJob.status);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Order Status</DialogTitle>
          <DialogDescription>
            Update the status for order &quot;{printJob.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Status</label>
            <div>
              <PrintJobStatusBadge status={printJob.status} />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="status-select" className="text-sm font-medium">
              New Status
            </label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as PrintJobStatus)}
            >
              <SelectTrigger id="status-select">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {BACKEND_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_DISPLAY_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isUpdating || selectedStatus === printJob.status}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUpdating ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
