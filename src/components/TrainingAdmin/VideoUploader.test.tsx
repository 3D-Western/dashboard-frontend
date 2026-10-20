import { describe, it, expect, vi, type Mock } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoUploadError, readVideoDuration, uploadVideo } from '@/lib/video-upload';
import { VideoUploader } from './VideoUploader';

vi.mock('@/lib/video-upload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/video-upload')>();
  return { ...actual, uploadVideo: vi.fn(), readVideoDuration: vi.fn() };
});

const upload = uploadVideo as unknown as Mock;
const duration = readVideoDuration as unknown as Mock;

const mp4 = new File([new Uint8Array(2048)], 'intro.mp4', { type: 'video/mp4' });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('VideoUploader', () => {
  it('says when there is no video, and shows the current file otherwise', () => {
    const { rerender } = render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);
    expect(screen.getByText(/no video has been uploaded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose a video/i })).toBeInTheDocument();

    rerender(<VideoUploader assetKey="videos/abc.mp4" onUploaded={vi.fn()} />);
    expect(screen.getByText('videos/abc.mp4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /replace the video/i })).toBeInTheDocument();
  });

  it('shows progress while uploading, then reports the key and the length', async () => {
    const pending = deferred<string>();
    let report: (fraction: number) => void = () => {};
    upload.mockImplementation((_file: File, onProgress: (fraction: number) => void) => {
      report = onProgress;
      return pending.promise;
    });
    duration.mockResolvedValue(125);
    const onUploaded = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={onUploaded} />);

    await userEvent.upload(screen.getByLabelText(/choose a video file/i), mp4);

    const bar = await screen.findByRole('progressbar', { name: /upload progress/i });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    act(() => report(0.4));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText(/uploading intro\.mp4: 40%/i)).toBeInTheDocument();

    act(() => report(1));
    await act(async () => pending.resolve('videos/new.mp4'));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/new.mp4', 125));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText(/uploaded intro\.mp4/i)).toBeInTheDocument();
  });

  it('shows why an upload failed and lets the user try again', async () => {
    upload
      .mockRejectedValueOnce(
        new VideoUploadError('The upload was interrupted. Check your connection.', 'network'),
      )
      .mockResolvedValueOnce('videos/second.mp4');
    duration.mockResolvedValue(null);
    const onUploaded = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={onUploaded} />);

    await userEvent.upload(screen.getByLabelText(/choose a video file/i), mp4);

    expect(await screen.findByText(/upload was interrupted/i)).toBeInTheDocument();
    expect(onUploaded).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /try the upload again/i }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/second.mp4', null));
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('words a refused upload URL request for people', async () => {
    const { ApiError } = await import('@/api/client/errors');
    upload.mockRejectedValue(
      new ApiError('FORBIDDEN', 'no', { missingPermission: 'training:author' }),
    );
    duration.mockResolvedValue(null);
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await userEvent.upload(screen.getByLabelText(/choose a video file/i), mp4);

    expect(await screen.findByText(/permission to author trainings/i)).toBeInTheDocument();
  });

  it('refuses a file that is not an MP4 before uploading anything', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await user.upload(
      screen.getByLabelText(/choose a video file/i),
      new File(['x'], 'clip.mov', { type: 'video/quicktime' }),
    );

    expect(await screen.findByText(/only mp4 videos/i)).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /try the upload again/i })).not.toBeInTheDocument();
  });

  it('cancels an upload in progress', async () => {
    upload.mockImplementation(
      (_file: File, _progress: unknown, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new VideoUploadError('The upload was cancelled.', 'aborted')),
          );
        }),
    );
    duration.mockResolvedValue(null);
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await userEvent.upload(screen.getByLabelText(/choose a video file/i), mp4);
    await userEvent.click(await screen.findByRole('button', { name: /cancel upload/i }));

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
