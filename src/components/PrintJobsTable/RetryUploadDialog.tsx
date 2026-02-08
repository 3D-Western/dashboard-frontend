'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileUploadDropzone } from '@/components/FileUploadDropzone';
import { jobApi } from '@/api/client/job';
import { calculateFileChecksum } from '@/lib/file-utils';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface RetryUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobName: string;
  onSuccess: () => void;
}

export function RetryUploadDialog({
  open,
  onOpenChange,
  jobId,
  jobName,
  onSuccess,
}: RetryUploadDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleRetryUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Get new presigned URL
      const retryResponse = await jobApi.retryUpload(jobId);

      // Step 2: Upload file to presigned URL
      await jobApi.uploadJobFile(retryResponse.presignedUrl, file);

      // Step 3: Complete upload with file metadata
      const checksum = await calculateFileChecksum(file);

      await jobApi.completeUpload(jobId, {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/sla',
        checksum: checksum,
      });

      toast.success('File uploaded successfully');
      setFile(null);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(
        'Failed to upload file. ' + (err instanceof Error ? err.message : 'Unknown error'),
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retry File Upload</DialogTitle>
          <DialogDescription>
            Upload a new file for job <span className="font-semibold text-foreground">&quot;{jobName}&quot;</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <FileUploadDropzone
            initialFile={file ?? undefined}
            onFileAccepted={(f) => setFile(f ?? null)}
            accept={{
              'model/stl': ['.stl'],
              'application/sla': ['.stl'],
              'application/octet-stream': ['.stl'],
            }}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setFile(null);
              onOpenChange(false);
            }}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button onClick={handleRetryUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <span className="inline-flex items-center">
                <Loader2 className="mr-2 -ml-1 h-4 w-4 animate-spin" />
                Uploading...
              </span>
            ) : (
              'Upload File'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
