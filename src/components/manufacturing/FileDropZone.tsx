'use client';

import { useState } from 'react';
import Dropzone, { DropzoneContent, DropzoneEmptyState } from '@/components/ui/dropzone';

interface FileDropZoneProps {
  onFileAccepted: (file: File | null) => void;
  initialFile?: File | undefined;
  accept: Record<string, string[]>;
}

export function FileDropZone({ onFileAccepted, initialFile, accept }: FileDropZoneProps) {
  const [localFiles, setLocalFiles] = useState<File[] | undefined>(
    initialFile ? [initialFile] : undefined,
  );

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
