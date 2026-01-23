'use client';

import { useState } from 'react';
import Dropzone, { DropzoneContent, DropzoneEmptyState } from '@/components/ui/dropzone';

interface FileDropZoneProps {
  onFileAccepted: (file: File | null) => void;
  accept: Record<string, string[]>;
}

export function FileDropZone({ onFileAccepted, accept }: FileDropZoneProps) {
  const [localFiles, setLocalFiles] = useState<File[] | undefined>(undefined);

  return (
    <Dropzone
      src={localFiles}
      maxFiles={1}
      accept={accept}
      onDrop={(acceptedFiles: File[]) => {
        if (!acceptedFiles || acceptedFiles.length === 0) {
          setLocalFiles(undefined);
          onFileAccepted(null);
          return;
        }

        const file = acceptedFiles[0];

        setLocalFiles([file]);
        onFileAccepted(file);
      }}
    >
      <DropzoneEmptyState />
      <DropzoneContent />
    </Dropzone>
  );
}
