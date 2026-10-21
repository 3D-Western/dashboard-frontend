import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  VideoCompressError,
  checkCompressionSupport,
  compressVideo,
  unsupported,
} from '@/lib/video-compress';
import { VideoUploadError, readVideoInfo, uploadVideo } from '@/lib/video-upload';
import { VideoUploader } from './VideoUploader';

vi.mock('@/lib/video-upload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/video-upload')>();
  return { ...actual, uploadVideo: vi.fn(), readVideoInfo: vi.fn() };
});

vi.mock('@/lib/video-compress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/video-compress')>();
  return { ...actual, checkCompressionSupport: vi.fn(), compressVideo: vi.fn() };
});

const upload = uploadVideo as unknown as Mock;
const probe = readVideoInfo as unknown as Mock;
const support = checkCompressionSupport as unknown as Mock;
const compress = compressVideo as unknown as Mock;

const info = (durationSeconds: number | null, width = 1280, height = 720) => ({
  durationSeconds,
  width,
  height,
});

/** A tiny file that reports a large size: the screen only reads the size, never the bytes. */
function fakeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const mov = fakeFile('intro.mov', 'video/quicktime', 40_000_000);
const small = fakeFile('intro-720p.mp4', 'video/mp4', 4_000_000);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const choose = (file: File) =>
  userEvent.upload(screen.getByLabelText(/choose a video file/i), file);

/** A compression that never finishes by itself, and rejects as "cancelled" when aborted. */
const cancellable = (_file: File, options: { signal: AbortSignal }) =>
  new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () =>
      reject(new VideoCompressError('Compression was cancelled.', 'aborted')),
    );
  });

beforeEach(() => {
  vi.clearAllMocks();
  support.mockResolvedValue({ supported: true });
  probe.mockResolvedValue(info(60));
  Object.assign(URL, {
    createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
    revokeObjectURL: vi.fn(),
  });
});

describe('VideoUploader compression', () => {
  it('compresses a file that is not an MP4 by itself, showing progress, and waits for a decision', async () => {
    // 38 MB over five minutes is about 1 Mbps: only the format is wrong, so the pictures can be copied.
    probe.mockResolvedValue(info(300));
    const pending = deferred<File>();
    let report: (fraction: number) => void = () => {};
    compress.mockImplementation((_file: File, options: { onProgress: (f: number) => void }) => {
      report = options.onProgress;
      return pending.promise;
    });
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose(mov);

    const bar = await screen.findByRole('progressbar', { name: /compression progress/i });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText(/compressing intro\.mov \(38\.1 MB\): 0%/i)).toBeInTheDocument();
    act(() => report(0.4));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    // The format warning is what compression fixes, so it is not shown as a to-do.
    expect(screen.queryByLabelText('Video warnings')).not.toBeInTheDocument();

    await act(async () => pending.resolve(small));

    expect(await screen.findByText(/38\.1 MB to 3\.8 MB \(90% smaller\)/)).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    expect(compress).toHaveBeenCalledWith(
      mov,
      expect.objectContaining({ signal: expect.any(AbortSignal), forceReencode: false }),
    );
  });

  it('compresses a picture taller than 720p, re-encoding a heavy one', async () => {
    compress.mockReturnValue(new Promise(() => {}));
    probe.mockResolvedValue(info(10, 1920, 1080));
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);
    // 20 MB in 10 s is 16 Mbps.
    await choose(fakeFile('big.mp4', 'video/mp4', 20_000_000));

    await screen.findByRole('progressbar', { name: /compression progress/i });
    expect(compress).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ forceReencode: true }),
    );
  });

  it('plays the compressed copy for checking, and uploads it when chosen', async () => {
    compress.mockResolvedValue(small);
    upload.mockResolvedValue('videos/small.mp4');
    const onUploaded = vi.fn();
    const onLocalPreview = vi.fn();
    render(
      <VideoUploader assetKey={null} onUploaded={onUploaded} onLocalPreview={onLocalPreview} />,
    );

    await choose(mov);
    await screen.findByText(/90% smaller/);

    expect(onLocalPreview).toHaveBeenLastCalledWith('blob:intro-720p.mp4');
    await userEvent.click(screen.getByRole('button', { name: /upload compressed version/i }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/small.mp4', 60));
    expect(upload.mock.calls[0][0]).toBe(small);
    expect(
      screen.getByText(/uploaded intro-720p\.mp4 \(3\.8 MB, compressed from 38\.1 MB\)/i),
    ).toBeInTheDocument();
  });

  it('lets staff upload the original instead, with its warnings back', async () => {
    compress.mockResolvedValue(small);
    upload.mockResolvedValue('videos/clip.mov');
    const onUploaded = vi.fn();
    const onLocalPreview = vi.fn();
    render(
      <VideoUploader assetKey={null} onUploaded={onUploaded} onLocalPreview={onLocalPreview} />,
    );

    await choose(mov);
    await screen.findByText(/90% smaller/);
    await userEvent.click(screen.getByRole('button', { name: /upload original instead/i }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/clip.mov', 60));
    expect(upload.mock.calls[0][0]).toBe(mov);
    expect(onLocalPreview).toHaveBeenLastCalledWith('blob:intro.mov');
    expect(screen.getByLabelText('Video warnings')).toHaveTextContent('This is not an MP4');
  });

  it('uploads the original MP4 by itself, and says so, when compressing made it larger', async () => {
    probe.mockResolvedValue(info(1, 1920, 1080));
    const original = fakeFile('a.mp4', 'video/mp4', 1000);
    compress.mockResolvedValue(fakeFile('a-720p.mp4', 'video/mp4', 2000));
    upload.mockResolvedValue('videos/a.mp4');
    const onUploaded = vi.fn();
    const onLocalPreview = vi.fn();
    render(
      <VideoUploader assetKey={null} onUploaded={onUploaded} onLocalPreview={onLocalPreview} />,
    );

    await choose(original);

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/a.mp4', 1));
    expect(upload.mock.calls[0][0]).toBe(original);
    expect(screen.getByText(/the original was kept/i)).toBeInTheDocument();
    expect(screen.getByText(/did not make this video smaller/i)).toBeInTheDocument();
    expect(onLocalPreview).toHaveBeenLastCalledWith('blob:a.mp4');
    // Nothing to choose: no review step was shown.
    expect(screen.queryByRole('button', { name: /upload compressed version/i })).toBeNull();
  });

  it('keeps a larger compressed file when the original is not an MP4, and warns', async () => {
    probe.mockResolvedValue(info(1, 1280, 720));
    const original = fakeFile('a.mov', 'video/quicktime', 1000);
    const larger = fakeFile('a-720p.mp4', 'video/mp4', 2000);
    compress.mockResolvedValue(larger);
    upload.mockResolvedValue('videos/a.mp4');
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose(original);

    expect(await screen.findByText(/the compressed copy is not smaller/i)).toBeInTheDocument();
    expect(screen.getByText(/only an mp4 can be published/i)).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /upload compressed version/i }));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0][0]).toBe(larger);
  });

  it('cancels a compression, keeping the file so staff can retry or upload it as it is', async () => {
    compress.mockImplementation(cancellable);
    upload.mockResolvedValue('videos/clip.mov');
    const onUploaded = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={onUploaded} />);

    await choose(mov);
    await userEvent.click(await screen.findByRole('button', { name: /cancel compression/i }));

    expect(await screen.findByText(/compression was cancelled/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try compressing again/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /upload original/i }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/clip.mov', 60));
    expect(compress).toHaveBeenCalledTimes(1);
  });

  it('says plainly when compression fails, and still lets the original go up', async () => {
    compress.mockRejectedValueOnce(
      new VideoCompressError('Compression failed: the encoder stopped.', 'failed'),
    );
    compress.mockResolvedValueOnce(small);
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose(mov);

    expect(await screen.findByText(/the encoder stopped/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload original/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try compressing again/i }));
    expect(await screen.findByText(/90% smaller/)).toBeInTheDocument();
  });

  it('abandons a compression when the screen is closed', async () => {
    let signal: AbortSignal | undefined;
    compress.mockImplementation((_file: File, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    const { unmount } = render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);
    await choose(mov);
    await screen.findByRole('progressbar', { name: /compression progress/i });

    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it('goes back to the choice when the upload of a compressed copy is cancelled', async () => {
    compress.mockResolvedValue(small);
    upload.mockImplementation(
      (_file: File, _progress: unknown, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new VideoUploadError('The upload was cancelled.', 'aborted')),
          );
        }),
    );
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose(mov);
    await userEvent.click(
      await screen.findByRole('button', { name: /upload compressed version/i }),
    );
    await userEvent.click(await screen.findByRole('button', { name: /cancel upload/i }));

    expect(await screen.findByText(/90% smaller/)).toBeInTheDocument();
    expect(compress).toHaveBeenCalledTimes(1);
  });

  it('retries a failed upload of the compressed copy without compressing again', async () => {
    compress.mockResolvedValue(small);
    upload
      .mockRejectedValueOnce(new VideoUploadError('The upload was interrupted.', 'network'))
      .mockResolvedValueOnce('videos/small.mp4');
    const onUploaded = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={onUploaded} />);

    await choose(mov);
    await userEvent.click(
      await screen.findByRole('button', { name: /upload compressed version/i }),
    );
    await userEvent.click(await screen.findByRole('button', { name: /try the upload again/i }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/small.mp4', 60));
    expect(compress).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[1][0]).toBe(small);
  });

  it('offers, but does not force, compression for an MP4 that could be lighter', async () => {
    probe.mockResolvedValue(info(10));
    upload.mockResolvedValue('videos/ok.mp4');
    const onUploaded = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={onUploaded} />);
    // 5 MB in 10 s is 4 Mbps: between the offer line (2.5) and the required line (5).
    await choose(fakeFile('ok.mp4', 'video/mp4', 5_000_000));

    expect(await screen.findByText(/compressing this video is recommended/i)).toBeInTheDocument();
    expect(compress).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /upload original/i }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/ok.mp4', 10));
  });

  it('compresses on request when it was only on offer', async () => {
    probe.mockResolvedValue(info(10));
    compress.mockResolvedValue(small);
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);
    await choose(fakeFile('ok.mp4', 'video/mp4', 5_000_000));

    await userEvent.click(await screen.findByRole('button', { name: /compress first/i }));

    expect(await screen.findByText(/to 3\.8 MB/)).toBeInTheDocument();
    expect(compress).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ forceReencode: true }),
    );
  });

  it('uploads a light 720p MP4 straight away, without asking', async () => {
    upload.mockResolvedValue('videos/good.mp4');
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose(fakeFile('intro.mp4', 'video/mp4', 2048));

    await screen.findByText(/uploaded intro\.mp4/i);
    expect(compress).not.toHaveBeenCalled();
    expect(support).not.toHaveBeenCalled();
  });

  it('does not compress a video whose result would be too large for the browser, and says why', async () => {
    // 40 minutes would give about 640 MB at the target rate.
    probe.mockResolvedValue(info(2400));
    upload.mockResolvedValue('videos/long.mov');
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose(fakeFile('long.mov', 'video/quicktime', 900_000_000));

    expect(await screen.findByText(/too big to compress safely/i)).toBeInTheDocument();
    expect(screen.getByText(/too big to compress safely/i)).toHaveTextContent(
      'scripts/encode-training-video.sh',
    );
    expect(compress).not.toHaveBeenCalled();
    expect(support).not.toHaveBeenCalled();
    await waitFor(() => expect(upload).toHaveBeenCalled());
  });

  it('re-encodes when the file is above the 2 Mbps target, even if only the container is wrong', async () => {
    // 38 MB over 100 s is 3 Mbps: above the target, below the 5 Mbps that forces compression.
    probe.mockResolvedValue(info(100));
    compress.mockReturnValue(new Promise(() => {}));
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose(mov);

    await screen.findByRole('progressbar', { name: /compression progress/i });
    expect(compress).toHaveBeenCalledWith(mov, expect.objectContaining({ forceReencode: true }));
  });
});

describe('VideoUploader in a browser that cannot compress', () => {
  it.each([
    ['no-webcodecs', /cannot compress videos by itself/i],
    ['no-h264', /no built-in H\.264 video encoder/i],
  ] as const)('explains (%s), names the script and uploads the original', async (reason, text) => {
    support.mockResolvedValue(unsupported(reason));
    upload.mockResolvedValue('videos/clip.mov');
    const onUploaded = vi.fn();
    render(<VideoUploader assetKey={null} onUploaded={onUploaded} />);

    await choose(mov);

    const note = await screen.findByText(text);
    expect(note).toHaveTextContent('scripts/encode-training-video.sh');
    expect(screen.getByText(/this browser cannot compress the video/i)).toBeInTheDocument();
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('videos/clip.mov', 60));
    expect(compress).not.toHaveBeenCalled();
    // The usual advice about the file stays, since nothing fixed it.
    expect(screen.getByLabelText('Video warnings')).toHaveTextContent('This is not an MP4');
  });

  it('stays quiet about it when compression was only on offer', async () => {
    support.mockResolvedValue(unsupported('no-h264'));
    probe.mockResolvedValue(info(10));
    upload.mockResolvedValue('videos/ok.mp4');
    render(<VideoUploader assetKey={null} onUploaded={vi.fn()} />);

    await choose(fakeFile('ok.mp4', 'video/mp4', 5_000_000));

    await screen.findByText(/uploaded ok\.mp4/i);
    expect(screen.queryByText(/cannot compress/i)).not.toBeInTheDocument();
  });
});
