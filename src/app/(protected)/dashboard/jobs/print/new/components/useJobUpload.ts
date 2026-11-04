'use client';

import { useCallback, useRef, useState } from 'react';
import { ApiError, ErrorCodes } from '@/api/client/errors';
import { jobApi } from '@/api/client/job';
import { TrainingErrorCodes } from '@/api/client/training-errors';
import { calculateFileChecksum } from '@/lib/file-utils';

export type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; jobId: string | null }
  | { phase: 'done'; jobId: string }
  | {
      phase: 'error';
      jobId: string | null;
      kind: 'orientation' | 'rate-limit' | 'other';
      message: string;
    };

const CONTENT_TYPES: Record<string, string> = {
  stl: 'application/sla',
  '3mf': 'model/3mf',
  step: 'model/step',
  stp: 'model/step',
};

export const contentTypeOf = (file: File) =>
  file.type ||
  CONTENT_TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''] ||
  'application/octet-stream';

/** "Robot Arm Gear v2.stl" becomes the job's name, "Robot Arm Gear v2" (30 characters at most). */
export const jobNameFromFile = (file: File) =>
  file.name
    .replace(/\.[^.]+$/, '')
    .trim()
    .slice(0, 30) || 'My print';

function describeError(error: unknown): Extract<UploadState, { phase: 'error' }> {
  if (error instanceof ApiError && error.code === TrainingErrorCodes.ORIENTATION_REQUIRED) {
    return {
      phase: 'error',
      jobId: null,
      kind: 'orientation',
      message: 'Finish Maker Orientation to submit prints.',
    };
  }
  if (error instanceof ApiError && error.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
    return {
      phase: 'error',
      jobId: null,
      kind: 'rate-limit',
      message: "You've reached your print limit for now. You can submit again once it resets.",
    };
  }
  return {
    phase: 'error',
    jobId: null,
    kind: 'other',
    message: error instanceof Error ? error.message : 'The upload did not finish.',
  };
}

/**
 * Uploads a model in the background: create the job, send the file to storage while the checksum
 * is computed alongside, then complete the upload (which starts the pipeline at once, before the
 * student has typed anything). Retrying after a failure continues with the job that exists.
 */
export function useJobUpload({ mockMode = false }: { mockMode?: boolean } = {}) {
  const [state, setState] = useState<UploadState>({ phase: 'idle' });
  const fileRef = useRef<File | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const run = useCallback(
    async (file: File) => {
      setState({ phase: 'uploading', jobId: jobIdRef.current });
      try {
        // Start hashing now; it finishes while the file is on its way.
        const checksum = calculateFileChecksum(file);
        let uploadUrl: string;
        if (jobIdRef.current) {
          uploadUrl = (await jobApi.retryUpload(jobIdRef.current)).presignedUrl;
        } else {
          const created = await jobApi.createJob({
            jobName: jobNameFromFile(file),
            category: 'ThreeDPrint',
            formAnswerJson: JSON.stringify({ contentType: contentTypeOf(file), flow: 'pipeline' }),
          });
          if (!created.jobId || !created.uploadUrl) {
            throw new Error('Invalid response from server: missing jobId or uploadUrl');
          }
          jobIdRef.current = created.jobId;
          uploadUrl = created.uploadUrl;
          setState({ phase: 'uploading', jobId: created.jobId });
        }

        // Mock mode has no storage to upload to (and would hit CORS).
        if (!mockMode) await jobApi.uploadJobFile(uploadUrl, file);

        await jobApi.completeUpload(jobIdRef.current, {
          fileName: file.name,
          fileSize: file.size,
          contentType: contentTypeOf(file),
          checksum: await checksum,
        });
        setState({ phase: 'done', jobId: jobIdRef.current });
      } catch (error) {
        setState({ ...describeError(error), jobId: jobIdRef.current });
      }
    },
    [mockMode],
  );

  const start = useCallback(
    (file: File) => {
      fileRef.current = file;
      jobIdRef.current = null;
      return run(file);
    },
    [run],
  );

  const retry = useCallback(() => {
    if (fileRef.current) void run(fileRef.current);
  }, [run]);

  return { state, start, retry };
}
