'use client';

import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PrintJob, PrintJobStatus } from '@/types/jobs';
import { jobApi } from '@/api/client/job';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChangeStatusDialog } from './ChangeStatusDialog';
import { DeleteJobDialog } from './DeleteJobDialog';
import { ReorderJobDialog } from './ReorderJobDialog';

interface ActionsCellProps {
  printJob: PrintJob;
  mode: 'user' | 'admin';
  onStatusChanged?: (jobId: string, newStatus: PrintJobStatus) => void;
  onJobDeleted?: (jobId: string) => void;
}

const DELETABLE_STATUSES: PrintJobStatus[] = ['PendingFile', 'InQueue'];

export function ActionsCell({ printJob, mode, onStatusChanged, onJobDeleted }: ActionsCellProps) {
  const [showChangeStatusDialog, setShowChangeStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);

  const canDelete = mode === 'user' && DELETABLE_STATUSES.includes(printJob.status);
  // jobs:reorder is own-scoped — only shown on the user's own jobs table, not the admin table
  const canReorder = mode === 'user';

  const handleDelete = async () => {
    try {
      await jobApi.deleteJob(printJob.id);
      toast.success('Job deleted successfully', {
        description: `"${printJob.name}" has been deleted.`,
      });
      onJobDeleted?.(printJob.id);
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job', {
        description: error instanceof Error ? error.message : 'An error occurred while deleting',
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label={`Actions for ${printJob.name}`}
            aria-haspopup="menu"
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={async () => {
              try {
                await navigator.clipboard.writeText(printJob.id);
              } catch (error) {
                console.error('Failed to copy Job ID to clipboard', error);
              }
            }}
          >
            Copy Job ID
          </DropdownMenuItem>
          {mode === 'admin' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setShowChangeStatusDialog(true)}>
                Change Status
              </DropdownMenuItem>
            </>
          )}
          {canReorder && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setShowReorderDialog(true)}>
                Reorder Job
              </DropdownMenuItem>
            </>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setShowDeleteDialog(true)}
              >
                Delete Job
              </DropdownMenuItem>
            </>
          )}
          {/* TODO: Future improvement - Implement download STL functionality */}
          {/* <DropdownMenuSeparator />
          <DropdownMenuItem disabled aria-disabled="true">
            Download STL (Coming soon)
          </DropdownMenuItem> */}
        </DropdownMenuContent>
      </DropdownMenu>

      {mode === 'admin' && (
        <ChangeStatusDialog
          printJob={printJob}
          open={showChangeStatusDialog}
          onOpenChange={setShowChangeStatusDialog}
          onStatusChanged={onStatusChanged}
        />
      )}

      {canReorder && (
        <ReorderJobDialog
          printJob={printJob}
          open={showReorderDialog}
          onOpenChange={setShowReorderDialog}
        />
      )}

      {canDelete && (
        <DeleteJobDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          jobName={printJob.name}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
