'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PrintJob } from '@/types/jobs';
import { jobApi } from '@/api/client/job';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ReorderJobDialogProps {
  printJob: PrintJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReorderJobDialog({ printJob, open, onOpenChange }: ReorderJobDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <ReorderJobDialogContent printJob={printJob} onOpenChange={onOpenChange} />
      ) : null}
    </Dialog>
  );
}

type ReorderJobDialogContentProps = Omit<ReorderJobDialogProps, 'open'>;

function ReorderJobDialogContent({ printJob, onOpenChange }: ReorderJobDialogContentProps) {
  const router = useRouter();
  const [name, setName] = useState(`${printJob.name} (copy)`);
  const [description, setDescription] = useState(printJob.description);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await jobApi.reorder(printJob.id, { name: name.trim(), description: description.trim() });

      toast.success('Job cloned successfully', {
        description: `"${name.trim()}" was added to your jobs.`,
      });

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to reorder job:', error);
      toast.error('Failed to clone job', {
        description: error instanceof Error ? error.message : 'An error occurred while cloning',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setName(`${printJob.name} (copy)`);
    setDescription(printJob.description);
    onOpenChange(false);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Reorder Job</DialogTitle>
        <DialogDescription>
          Clone &quot;{printJob.name}&quot; using the same file with a new name and description.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="reorder-name">Name</Label>
          <Input
            id="reorder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reorder-description">Description</Label>
          <Textarea
            id="reorder-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={isSubmitting || !name.trim()}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Cloning...' : 'Clone Job'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
