'use client';

import { useState } from 'react';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/Dropzone';

type FileUploadDropzoneProps = {
  onFileAccepted: (file: File | null) => void;
  initialFile?: File;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  /** Called with the reason when the dropzone itself refuses what was dropped (wrong type, several files). */
  onError?: (error: Error) => void;
};

/**
 * A reusable file upload dropzone component that handles single or multiple file uploads.
 * Supports custom file type restrictions and maintains controlled state.
 * By default, accepts all file types unless `accept` prop is provided.
 */
export function FileUploadDropzone({
  onFileAccepted,
  initialFile,
  accept,
  maxFiles = 1,
  onError,
}: FileUploadDropzoneProps) {
  const [localFiles, setLocalFiles] = useState<File[] | undefined>(
    initialFile ? [initialFile] : undefined,
  );

  return (
    <Dropzone
      src={localFiles}
      maxFiles={maxFiles}
      accept={accept}
      onError={onError}
      onDrop={(acceptedFiles: File[]) => {
        if (!acceptedFiles || acceptedFiles.length === 0) {
          setLocalFiles(undefined);
          onFileAccepted(null);
          return;
        }

        // For single file mode, pick the first accepted file
        const selectedFile = acceptedFiles[0];
        setLocalFiles([selectedFile]);
        onFileAccepted(selectedFile);
      }}
    >
      <DropzoneEmptyState />
      <DropzoneContent />
    </Dropzone>
  );
}
