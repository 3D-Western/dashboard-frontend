'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Upload } from 'lucide-react';
import { adminErrorMessage } from '@/lib/training-admin-errors';
import { formatBytes } from '@/lib/training-admin-format';
import {
  VideoUploadError,
  readVideoDuration,
  uploadVideo,
  videoFileProblem,
  videoLengthProblem,
} from '@/lib/video-upload';
import { Button } from '@/components/ui/button';
import { ErrorNote } from './feedback';

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; file: File; fraction: number }
  | { phase: 'failed'; file: File; message: string; retryable: boolean }
  | { phase: 'done'; file: File };

interface VideoUploaderProps {
  /** The file already attached to the step, if any. */
  assetKey: string | null;
  /** Called when the upload finished: the key to store, and the length read from the file. */
  onUploaded: (assetKey: string, durationSeconds: number | null) => void;
}

/**
 * Uploads a video straight to storage with a presigned PUT, showing progress. The step stores only
 * the returned asset key; saving the step is a separate action.
 */
export function VideoUploader({ assetKey, onUploaded }: VideoUploaderProps) {
  const [state, setState] = useState<UploadState>({ phase: 'idle' });
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Leaving the screen must not leave a large upload running in the background.
  useEffect(() => () => abort.current?.abort(), []);

  const start = async (file: File) => {
    const problem = videoFileProblem(file);
    if (problem) {
      setState({ phase: 'failed', file, message: problem, retryable: false });
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    setState({ phase: 'uploading', file, fraction: 0 });
    try {
      // Read the length first: a video over ten minutes is refused before any of it is sent.
      const duration = await readVideoDuration(file);
      if (controller.signal.aborted) {
        setState({ phase: 'idle' });
        return;
      }
      const tooLong = videoLengthProblem(duration);
      if (tooLong) {
        setState({ phase: 'failed', file, message: tooLong, retryable: false });
        return;
      }
      const key = await uploadVideo(
        file,
        (fraction) =>
          setState((current) =>
            current.phase === 'uploading' ? { ...current, fraction } : current,
          ),
        controller.signal,
      );
      setState({ phase: 'done', file });
      onUploaded(key, duration);
    } catch (error) {
      if (error instanceof VideoUploadError && error.kind === 'aborted') {
        setState({ phase: 'idle' });
        return;
      }
      const message =
        error instanceof VideoUploadError
          ? error.message
          : adminErrorMessage(error, "We couldn't start the upload. Try again.");
      setState({ phase: 'failed', file, message, retryable: true });
    }
  };

  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void start(file);
  };

  const percent = state.phase === 'uploading' ? Math.round(state.fraction * 100) : 0;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="text-sm">
        {state.phase === 'done' ? (
          <p className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="size-4" /> Uploaded {state.file.name} (
            {formatBytes(state.file.size)}). Save the step to keep it.
          </p>
        ) : assetKey ? (
          <p>
            Current file: <span className="font-mono text-xs break-all">{assetKey}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">No video has been uploaded for this step yet.</p>
        )}
      </div>

      {state.phase === 'uploading' ? (
        <div className="space-y-2">
          <div
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              Uploading {state.file.name}: {percent}%
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => abort.current?.abort()}
            >
              Cancel upload
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept="video/mp4"
            aria-label="Choose a video file"
            onChange={choose}
            className="sr-only"
            tabIndex={-1}
          />
          <Button type="button" variant="outline" onClick={() => input.current?.click()}>
            <Upload /> {assetKey || state.phase === 'done' ? 'Replace the video' : 'Choose a video'}
          </Button>
          <span className="text-xs text-muted-foreground">
            MP4, 10 minutes or less, up to 1 GB.
          </span>
        </div>
      )}

      {state.phase === 'failed' && (
        <div className="space-y-2">
          <ErrorNote message={state.message} />
          {state.retryable && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void start(state.file)}
            >
              Try the upload again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
