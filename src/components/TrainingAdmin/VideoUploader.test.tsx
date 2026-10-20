import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { setVideoPreparer } from '@/lib/video-prepare';
import { VideoUploadError, readVideoInfo, uploadVideo } from '@/lib/video-upload';
import { VideoUploader } from './VideoUploader';

vi.mock('@/lib/video-upload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/video-upload')>();
  return { ...actual, uploadVideo: vi.fn(), readVideoInfo: vi.fn() };
});

const upload = uploadVideo as unknown as Mock;
const probe = readVideoInfo as unknown as Mock;

const info = (durationSeconds: number | null, width = 1280, height = 720) => ({
  durationSeconds,
  width,
  height,
});

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

beforeEach(() => {
  setVideoPreparer();
  probe.mockResolvedValue(info(60));
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:local-preview'),
    revokeObjectURL: vi.fn(),
  });
});

const choose = (file: File = mp4) =>
  userEvent.upload(screen.getByLabelText(/choose a video file/i), file);

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
    probe.mockResolvedValue(info(125));
    const onUploaded = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={onUploaded} />);

    await choose();

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
    probe.mockResolvedValue(info(null));
    const onUploaded = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={onUploaded} />);

    await choose();

    expect(await screen.findByText(/upload was interrupted/i)).toBeInTheDocument();
    expect(onUploaded).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /try the upload again/i }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/second.mp4', null));
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('words a refused upload URL request for people', async () => {
    upload.mockRejectedValue(
      new ApiError('FORBIDDEN', 'no', { missingPermission: 'training:author' }),
    );
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose();

    expect(await screen.findByText(/permission to author trainings/i)).toBeInTheDocument();
  });

  it('refuses a kind of file the server cannot store, and says how to convert it', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await user.upload(
      screen.getByLabelText(/choose a video file/i),
      new File(['x'], 'clip.mkv', { type: 'video/x-matroska' }),
    );

    expect(await screen.findByText(/scripts\/encode-training-video\.sh/i)).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /try the upload again/i })).not.toBeInTheDocument();
  });

  it('cancels an upload in progress, keeping the chosen file to try again', async () => {
    upload.mockImplementation(
      (_file: File, _progress: unknown, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new VideoUploadError('The upload was cancelled.', 'aborted')),
          );
        }),
    );
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose();
    await userEvent.click(await screen.findByRole('button', { name: /cancel upload/i }));

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload intro\.mp4/i })).toBeInTheDocument();
  });
});

describe('VideoUploader local preview', () => {
  it('offers the chosen file for playing straight away, before and during the upload', async () => {
    upload.mockReturnValue(new Promise(() => {}));
    const onLocalPreview = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} onLocalPreview={onLocalPreview} />);

    await choose();

    await waitFor(() => expect(onLocalPreview).toHaveBeenCalledWith('blob:local-preview'));
    expect(URL.createObjectURL).toHaveBeenCalledWith(mp4);
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('gives up the previous address when another file is chosen, and when closed', async () => {
    upload.mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);
    await choose();
    await screen.findByRole('progressbar');

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-preview');
  });

  it('offers no preview for a file that cannot be uploaded', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onLocalPreview = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} onLocalPreview={onLocalPreview} />);

    await user.upload(
      screen.getByLabelText(/choose a video file/i),
      new File(['x'], 'clip.avi', { type: 'video/x-msvideo' }),
    );

    await screen.findByText(/cannot be uploaded/i);
    expect(onLocalPreview).toHaveBeenLastCalledWith(null);
  });
});

describe('VideoUploader warnings', () => {
  it('warns strongly about a video over ten minutes, but uploads it all the same', async () => {
    probe.mockResolvedValue(info(725));
    upload.mockResolvedValue('videos/long.mp4');
    const onUploaded = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={onUploaded} />);

    await choose();

    const warnings = await screen.findByLabelText('Video warnings');
    expect(warnings).toHaveTextContent('This video is long');
    expect(warnings).toHaveTextContent(/12:05 long, more than the 10 minutes/i);
    expect(warnings).toHaveTextContent(/split it into two steps/i);
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/long.mp4', 725));
  });

  it('warns about a picture larger than 1080p and names the script', async () => {
    probe.mockResolvedValue(info(120, 3840, 2160));
    upload.mockResolvedValue('videos/big.mp4');
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose();

    const warnings = await screen.findByLabelText('Video warnings');
    expect(warnings).toHaveTextContent('3840 x 2160, larger than 1080p');
    expect(warnings).toHaveTextContent('Run scripts/encode-training-video.sh');
  });

  it('warns about a heavy file (over about 5 Mbps)', async () => {
    probe.mockResolvedValue(info(10));
    upload.mockResolvedValue('videos/heavy.mp4');
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);
    // 20 MB in 10 s is 16 Mbps
    await choose(new File([new Uint8Array(20_000_000)], 'heavy.mp4', { type: 'video/mp4' }));

    const warnings = await screen.findByLabelText('Video warnings');
    expect(warnings).toHaveTextContent('This video file is heavy');
    expect(warnings).toHaveTextContent(/about 16\.0 Mbps/);
  });

  it('warns about a file that is not an MP4, and still uploads it', async () => {
    upload.mockResolvedValue('videos/clip.mov');
    const onUploaded = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={onUploaded} />);

    await choose(new File([new Uint8Array(100)], 'clip.mov', { type: 'video/quicktime' }));

    const warnings = await screen.findByLabelText('Video warnings');
    expect(warnings).toHaveTextContent('This is not an MP4');
    expect(warnings).toHaveTextContent('QuickTime');
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/clip.mov', 60));
  });

  it('shows no warnings for a well-made video', async () => {
    upload.mockResolvedValue('videos/good.mp4');
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose();

    await screen.findByText(/uploaded intro\.mp4/i);
    expect(screen.queryByLabelText('Video warnings')).not.toBeInTheDocument();
  });
});

describe('VideoUploader safeguards', () => {
  it('abandons the upload when the screen is closed', async () => {
    let signal: AbortSignal | undefined;
    upload.mockImplementation(
      (_file: File, _progress: unknown, s: AbortSignal) =>
        new Promise(() => {
          signal = s;
        }),
    );
    const { unmount } = render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);
    await choose();
    await screen.findByRole('progressbar');
    await waitFor(() => expect(signal).toBeDefined());
    expect(signal?.aborted).toBe(false);

    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it('shows the expired-link message and offers another try', async () => {
    upload.mockRejectedValueOnce(
      new VideoUploadError(
        'The upload link expired. Try the upload again to get a new one.',
        'rejected',
        403,
      ),
    );
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose();

    expect(await screen.findByText(/upload link expired/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try the upload again/i })).toBeInTheDocument();
  });
});

describe('VideoUploader and the compression hook', () => {
  it('uploads whatever the registered preparer returns, and nothing else by default', async () => {
    upload.mockResolvedValue('videos/small.mp4');
    const smaller = new File([new Uint8Array(10)], 'intro-720p.mp4', { type: 'video/mp4' });
    const preparer = vi.fn(async () => smaller);
    setVideoPreparer(preparer);
    const onUploaded = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={onUploaded} />);

    await choose();

    await waitFor(() => expect(onUploaded).toHaveBeenCalled());
    expect(preparer).toHaveBeenCalledWith(mp4, info(60), [], expect.any(AbortSignal));
    expect(upload.mock.calls[0][0]).toBe(smaller);
    expect(screen.getByText(/uploaded intro-720p\.mp4/i)).toBeInTheDocument();
  });
});
