'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Hash, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobApi } from '@/api/client/job';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteJobDialog } from '@/components/PrintJobsTable/DeleteJobDialog';
import { ReorderJobDialog } from '@/components/PrintJobsTable/ReorderJobDialog';
import { PrintJob } from '@/types/jobs';
import { DELETABLE_STATUSES } from '../lib/job-stages';
import { copyToClipboard } from '@/lib/clipboard';

type OpenDialog = 'reorder' | 'delete' | null;

interface JobRowMenuProps {
  job: Pick<PrintJob, 'id' | 'name' | 'description' | 'status'>;
  /** Runs after a successful delete; by default the current page is refreshed */
  onDeleted?: () => void;
}

// The secondary actions the old "My Jobs" table had in its row menu
export function JobRowMenu({ job, onDeleted }: JobRowMenuProps) {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  const canDelete = DELETABLE_STATUSES.includes(job.status);
  // A job whose file never uploaded has nothing to print again
  const canPrintAgain = job.status !== 'PendingFile';

  const handleCopyId = async () => {
    try {
      await copyToClipboard(job.id);
      toast.success('Job ID copied');
    } catch (error) {
      console.error('Failed to copy Job ID to clipboard', error);
      toast.error("Couldn't copy the job ID");
    }
  };

  const handleDelete = async () => {
    try {
      await jobApi.deleteJob(job.id);
      toast.success('Job deleted', { description: `"${job.name}" has been deleted.` });
      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job', {
        description: error instanceof Error ? error.message : 'An error occurred while deleting',
      });
    } finally {
      setOpenDialog(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-lg" aria-label={`More actions for ${job.name}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canPrintAgain && (
            <DropdownMenuItem onSelect={() => setOpenDialog('reorder')}>
              <Copy aria-hidden="true" />
              Print again
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={handleCopyId}>
            <Hash aria-hidden="true" />
            Copy job ID
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setOpenDialog('delete')}>
                <Trash2 aria-hidden="true" />
                Delete job
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canPrintAgain && (
        <ReorderJobDialog
          printJob={job}
          open={openDialog === 'reorder'}
          onOpenChange={(open) => setOpenDialog(open ? 'reorder' : null)}
        />
      )}
      {canDelete && (
        <DeleteJobDialog
          open={openDialog === 'delete'}
          onOpenChange={(open) => setOpenDialog(open ? 'delete' : null)}
          jobName={job.name}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
