'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { adminErrorMessage } from '@/lib/training-admin-errors';
import { formatBytes } from '@/lib/training-admin-format';
import {
  MAX_COMPRESS_SECONDS,
  VideoCompressError,
  checkCompressionSupport,
  compressionAdvice,
  compressVideo,
  unsupported,
  type CompressionReason,
} from '@/lib/video-compress';
import {
  VideoUploadError,
  readVideoInfo,
  uploadVideo,
  videoFileProblem,
  videoTypeOf,
  type VideoInfo,
} from '@/lib/video-upload';
import { videoWarnings, type VideoWarning } from '@/lib/video-warnings';
import { ErrorNote } from './feedback';
import { VideoWarnings } from './VideoWarnings';

type UploadState =
  | { phase: 'idle' }
  /** Reading the file's length and size, and asking the browser what it can do. */
  | { phase: 'checking'; file: File }
  | { phase: 'compressing'; file: File; fraction: number }
  /** Compression is on offer, was cancelled, or did not work: staff choose what to upload. */
  | { phase: 'choice'; file: File; reasons: CompressionReason[]; note: string | null }
  /** Compressed: play it, then choose which one to upload. */
  | { phase: 'review'; original: File; compressed: File }
  | { phase: 'uploading'; file: File; fraction: number }
  | { phase: 'failed'; file: File; message: string; retryable: boolean }
  | { phase: 'done'; file: File; original: File | null };

const REASON_TEXT: Record<CompressionReason, string> = {
  format: 'it is not an MP4',
  resolution: 'it is taller than 720p',
  bitrate: 'it is heavier than a phone on mobile data handles well',
};

const percentOf = (fraction: number) => Math.round(fraction * 100);

interface VideoUploaderProps {
  /** The file already attached to the step, if any. */
  assetKey: string | null;
  /** Called when the upload finished: the key to store, and the length read from the file. */
  onUploaded: (assetKey: string, durationSeconds: number | null) => void;
  /**
   * Called with a local address the chosen file can be played from, as soon as it is chosen and
   * before it is uploaded, or with null when there is none. After compression it is the address of
   * the compressed copy, so it can be checked before uploading. The caller only plays it.
   */
  onLocalPreview?: (url: string | null) => void;
}

/**
 * Uploads a video straight to storage with a presigned PUT, showing progress. A video that is not
 * a 720p MP4 is first compressed in this browser (nothing leaves the computer, and it costs us
 * nothing), with progress, a cancel button and a preview of the result; staff can always upload
 * the original instead. A browser that cannot compress says so and uploads the original: nothing
 * here ever blocks an upload. The step stores only the returned asset key; saving the step is a
 * separate action.
 */
export function VideoUploader({ assetKey, onUploaded, onLocalPreview }: VideoUploaderProps) {
  const [state, setState] = useState<UploadState>({ phase: 'idle' });
  const [chosen, setChosen] = useState<File | null>(null);
  const [warnings, setWarnings] = useState<VideoWarning[]>([]);
  /** Why this browser could not compress, when it was needed. */
  const [cannotCompress, setCannotCompress] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const blobUrl = useRef<string | null>(null);
  const info = useRef<VideoInfo | null>(null);
  const allWarnings = useRef<VideoWarning[]>([]);
  /** The compressed copy and the file it came from, while both are in play. */
  const pair = useRef<{ original: File; compressed: File } | null>(null);

  const showLocal = (file: File | null) => {
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    blobUrl.current =
      file && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
    onLocalPreview?.(blobUrl.current);
  };

  // Leaving the screen must not leave a large upload, or a long compression, running behind it.
  useEffect(
    () => () => {
      abort.current?.abort();
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    },
    [],
  );

  const newController = () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    return controller;
  };

  /** Sends [file] to storage. */
  const send = async (file: File) => {
    const controller = newController();
    setState({ phase: 'uploading', file, fraction: 0 });
    try {
      const key = await uploadVideo(
        file,
        (fraction) =>
          setState((current) =>
            current.phase === 'uploading' ? { ...current, fraction } : current,
          ),
        controller.signal,
      );
      const original = pair.current?.compressed === file ? pair.current.original : null;
      setState({ phase: 'done', file, original });
      onUploaded(key, info.current?.durationSeconds ?? null);
    } catch (error) {
      if (error instanceof VideoUploadError && error.kind === 'aborted') {
        // Cancelled: go back to where the choice was, so nothing has to be redone.
        if (pair.current?.compressed === file) {
          setState({ phase: 'review', ...pair.current });
        } else {
          setState({ phase: 'idle' });
        }
        return;
      }
      const message =
        error instanceof VideoUploadError
          ? error.message
          : adminErrorMessage(error, "We couldn't start the upload. Try again.");
      setState({ phase: 'failed', file, message, retryable: true });
    }
  };

  /** Compresses [file] here, then lets staff look at the result before anything is uploaded. */
  const compress = async (file: File, reasons: CompressionReason[]) => {
    const controller = newController();
    setState({ phase: 'compressing', file, fraction: 0 });
    showLocal(file);
    try {
      const compressed = await compressVideo(file, {
        signal: controller.signal,
        // A file that is only in the wrong container can be copied; a heavy one must be re-encoded.
        forceReencode: reasons.includes('bitrate'),
        onProgress: (fraction) =>
          setState((current) =>
            current.phase === 'compressing' ? { ...current, fraction } : current,
          ),
      });
      pair.current = { original: file, compressed };
      showLocal(compressed);
      setState({ phase: 'review', original: file, compressed });
    } catch (error) {
      const cancelled = error instanceof VideoCompressError && error.kind === 'aborted';
      setState({
        phase: 'choice',
        file,
        reasons,
        note: cancelled
          ? 'Compression was cancelled.'
          : `${error instanceof VideoCompressError ? error.message : 'Compression failed.'} You can try again, or upload the original.`,
      });
    }
  };

  /** Sends the original, with every warning it deserves now that nothing fixes them. */
  const sendOriginal = (file: File) => {
    setWarnings(allWarnings.current);
    showLocal(file);
    pair.current = null;
    void send(file);
  };

  const start = async (file: File) => {
    setChosen(file);
    setWarnings([]);
    setCannotCompress(null);
    pair.current = null;
    info.current = null;
    const problem = videoFileProblem(file);
    if (problem) {
      showLocal(null);
      setState({ phase: 'failed', file, message: problem, retryable: false });
      return;
    }
    showLocal(file);
    const controller = newController();
    setState({ phase: 'checking', file });

    // Look at the file first: its length and size draw warnings, but never stop the upload.
    const probed = await readVideoInfo(file);
    if (controller.signal.aborted) {
      setState({ phase: 'idle' });
      return;
    }
    info.current = probed;
    const found = videoWarnings(file, probed);
    allWarnings.current = found;
    const advice = compressionAdvice(file, probed);
    if (advice.mode === 'unneeded') {
      setWarnings(found);
      await send(file);
      return;
    }

    const tooLong =
      probed.durationSeconds !== null && probed.durationSeconds > MAX_COMPRESS_SECONDS;
    const support = tooLong ? unsupported('too-long') : await checkCompressionSupport();
    if (controller.signal.aborted) {
      setState({ phase: 'idle' });
      return;
    }
    if (!support.supported) {
      // Explain why, and upload as it is. Only say so when compressing was actually needed.
      setWarnings(found);
      if (advice.mode === 'required') setCannotCompress(support.message);
      await send(file);
      return;
    }

    // Compression fixes size, format and weight; only the length is left for the author to judge.
    setWarnings(found.filter((warning) => warning.id === 'long'));
    if (advice.mode === 'required') {
      await compress(file, advice.reasons);
    } else {
      setState({ phase: 'choice', file, reasons: advice.reasons, note: null });
    }
  };

  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void start(file);
  };

  const busy =
    state.phase === 'checking' || state.phase === 'compressing' || state.phase === 'uploading';
  const percent =
    state.phase === 'uploading' || state.phase === 'compressing' ? percentOf(state.fraction) : 0;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="text-sm">
        {state.phase === 'done' ? (
          <p className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="size-4" /> Uploaded {state.file.name} (
            {formatBytes(state.file.size)}
            {state.original ? `, compressed from ${formatBytes(state.original.size)}` : ''}). Save
            the step to keep it.
          </p>
        ) : assetKey ? (
          <p>
            Current file: <span className="font-mono text-xs break-all">{assetKey}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">No video has been uploaded for this step yet.</p>
        )}
      </div>

      {state.phase === 'checking' && (
        <p className="text-sm text-muted-foreground" role="status">
          Looking at {state.file.name}...
        </p>
      )}

      {state.phase === 'compressing' && (
        <div className="space-y-2">
          <div
            role="progressbar"
            aria-label="Compression progress"
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
              Compressing {state.file.name} ({formatBytes(state.file.size)}): {percent}%
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => abort.current?.abort()}
            >
              Cancel compression
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This runs on your computer, not on a server, and can take a few minutes. Keep this tab
            open. You can watch the original below meanwhile.
          </p>
        </div>
      )}

      {state.phase === 'choice' && (
        <div className="space-y-2 text-sm">
          <p>
            {state.note ??
              (state.reasons.length > 0
                ? `Compressing this video is recommended because ${state.reasons.map((r) => REASON_TEXT[r]).join(' and ')}. It makes a 720p MP4 that starts quickly on a phone.`
                : 'We could not read this video well enough to tell if it needs compressing. You can compress it to a 720p MP4, or upload it as it is.')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void compress(state.file, state.reasons)}>
              {state.note ? 'Try compressing again' : 'Compress first'}
            </Button>
            <Button type="button" variant="outline" onClick={() => sendOriginal(state.file)}>
              Upload original
            </Button>
          </div>
        </div>
      )}

      {state.phase === 'review' && (
        <ReviewPanel state={state} onUpload={send} onOriginal={sendOriginal} />
      )}

      {state.phase === 'uploading' && (
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
          <p className="text-xs text-muted-foreground">
            You can watch the video below while it uploads.
          </p>
        </div>
      )}

      {!busy && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            aria-label="Choose a video file"
            onChange={choose}
            className="sr-only"
            tabIndex={-1}
          />
          <Button type="button" variant="outline" onClick={() => input.current?.click()}>
            <Upload /> {assetKey || state.phase === 'done' ? 'Replace the video' : 'Choose a video'}
          </Button>
          {state.phase === 'idle' && chosen && (
            <Button type="button" variant="ghost" onClick={() => void start(chosen)}>
              Upload {chosen.name}
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            MP4 is best. Up to 1 GB; about 10 minutes or less. Other videos are compressed to 720p
            here in your browser.
          </span>
        </div>
      )}
      {cannotCompress && (
        <Alert variant="warning" role="note">
          <AlertTitle>This browser cannot compress the video</AlertTitle>
          <AlertDescription>{cannotCompress}</AlertDescription>
        </Alert>
      )}

      <VideoWarnings warnings={warnings} />

      {state.phase === 'failed' && (
        <div className="space-y-2">
          <ErrorNote message={state.message} />
          {state.retryable && (
            <Button type="button" size="sm" variant="outline" onClick={() => void send(state.file)}>
              Try the upload again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Before and after, with the choice of which to upload. The compressed copy is playing below. */
function ReviewPanel({
  state,
  onUpload,
  onOriginal,
}: {
  state: Extract<UploadState, { phase: 'review' }>;
  onUpload: (file: File) => void;
  onOriginal: (file: File) => void;
}) {
  const { original, compressed } = state;
  const smaller = compressed.size < original.size;
  const saved = Math.round((1 - compressed.size / original.size) * 100);
  // A copy that is not smaller is only worth it when the original cannot be used as it is.
  const preferOriginal = !smaller && videoTypeOf(original) === 'video/mp4';
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium" role="status">
        Compressed: {formatBytes(original.size)} to {formatBytes(compressed.size)}
        {smaller ? ` (${saved}% smaller)` : ' (not smaller)'}.
      </p>
      <p className="text-muted-foreground">
        {preferOriginal
          ? 'The compressed copy is not smaller than the original, so uploading the original is fine. '
          : ''}
        Play it below to check that it looks and sounds right before you upload it.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={preferOriginal ? 'outline' : 'default'}
          onClick={() => onUpload(compressed)}
        >
          Upload compressed version
        </Button>
        <Button
          type="button"
          variant={preferOriginal ? 'default' : 'outline'}
          onClick={() => onOriginal(original)}
        >
          Upload original instead
        </Button>
      </div>
    </div>
  );
}
