'use client';

import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { PrintJob, PrintJobStatus } from '@/types/jobs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChangeStatusDialog } from './ChangeStatusDialog';

interface ActionsCellProps {
  printJob: PrintJob;
  mode: 'user' | 'admin';
  onStatusChanged?: (jobId: string, newStatus: PrintJobStatus) => void;
}

export function ActionsCell({ printJob, mode, onStatusChanged }: ActionsCellProps) {
  const [showChangeStatusDialog, setShowChangeStatusDialog] = useState(false);

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
          {/* TODO: Future improvement - Implement cancel/delete print functionality */}
          {/* {canCancel && setJobs && (
            <DropdownMenuItem
              // Use jobApi.deleteJob(printJob.id) to delete the job
              // Note: Jobs can only be deleted before printing starts (status: PENDING_FILE, InQueue)
              // onClick={async () => {
              //   try {
              //     await jobApi.deleteJob(printJob.id);
              //     // Update UI after successful deletion
              //   } catch (e) {
              //     console.error('Failed to delete job', e);
              //   }
              // }}
              onClick={() => {
                setJobs((prev) => prev.filter((j) => j.id !== printJob.id));
              }}
            >
              Delete Job
            </DropdownMenuItem>
          )} */}
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
    </>
  );
}
