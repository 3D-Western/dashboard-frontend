'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PrintJob } from '@/types/jobs';
import { jobApi } from '@/api/client/job';
import { unratedPrintsOf } from '@/api/client/pipeline';
import { Routes } from '@/lib/routes';
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
  printJob: Pick<PrintJob, 'id' | 'name' | 'description'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReorderJobDialog({ printJob, open, onOpenChange }: ReorderJobDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <ReorderJobDialogContent printJob={printJob} onOpenChange={onOpenChange} /> : null}
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

      toast.success('New job created', {
        description: `"${name.trim()}" was added to your jobs.`,
      });

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const unrated = unratedPrintsOf(error);
      if (unrated) {
        // Rate first (P-20): the backend holds new 3D-print jobs until the last collected print is rated.
        const first = unrated[0];
        toast.error('Rate your last print first', {
          description: error instanceof Error ? error.message : 'It takes one tap.',
          action: first
            ? { label: 'Rate it', onClick: () => router.push(Routes.jobs.detail(first.jobId)) }
            : undefined,
        });
        onOpenChange(false);
        return;
      }
      console.error('Failed to reorder job:', error);
      toast.error("Couldn't create the new job", {
        description: error instanceof Error ? error.message : 'An error occurred while copying',
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
        <DialogTitle>Print again</DialogTitle>
        <DialogDescription>
          Create a new job from &quot;{printJob.name}&quot; using the same file. You can change the
          name and description first.
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
          {isSubmitting ? 'Creating...' : 'Create job'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
