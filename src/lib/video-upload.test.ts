import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { trainingAdminAPI } from '@/api/client/training-admin';
import {
  MAX_VIDEO_BYTES,
  VideoUploadError,
  putToStorage,
  readVideoDuration,
  uploadVideo,
  videoFileProblem,
} from './video-upload';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { getVideoUploadUrl: vi.fn() },
}));

const api = trainingAdminAPI as unknown as { getVideoUploadUrl: Mock };

/** Stands in for the browser's XMLHttpRequest; the test drives progress and the outcome. */
class FakeXhr {
  static last: FakeXhr;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  headers: Record<string, string> = {};
  method = '';
  url = '';
  status = 0;
  body: unknown = null;
  aborted = false;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent);
  }
  finish(status: number) {
    this.status = status;
    this.onload?.();
  }
}

const mp4 = (size = 1000) => new File([new Uint8Array(size)], 'intro.mp4', { type: 'video/mp4' });

beforeEach(() => {
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('videoFileProblem', () => {
  it('accepts an MP4 of reasonable size', () => {
    expect(videoFileProblem({ type: 'video/mp4', size: 1000 })).toBeNull();
  });

  it('explains why a file cannot be uploaded', () => {
    expect(videoFileProblem({ type: 'video/quicktime', size: 1000 })).toMatch(/MP4/);
    expect(videoFileProblem({ type: 'video/mp4', size: 0 })).toMatch(/empty/);
    expect(videoFileProblem({ type: 'video/mp4', size: MAX_VIDEO_BYTES + 1 })).toMatch(/1 GB/);
  });
});

describe('putToStorage', () => {
  it('PUTs the file with the signed headers, minus the ones the browser sets', async () => {
    const file = mp4();
    const progress = vi.fn();
    const done = putToStorage(
      'https://storage.test/videos/a.mp4?sig=1',
      { 'Content-Type': 'video/mp4', 'Content-Length': '1000', 'x-amz-meta-a': 'b' },
      file,
      progress,
    );

    const xhr = FakeXhr.last;
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe('https://storage.test/videos/a.mp4?sig=1');
    expect(xhr.headers).toEqual({ 'Content-Type': 'video/mp4', 'x-amz-meta-a': 'b' });
    expect(xhr.body).toBe(file);

    xhr.progress(250, 1000);
    xhr.progress(500, 1000);
    xhr.finish(200);
    await expect(done).resolves.toBeUndefined();
    expect(progress.mock.calls.map(([fraction]) => fraction)).toEqual([0.25, 0.5, 1]);
  });

  it('rejects with the storage status when the service refuses the upload', async () => {
    const done = putToStorage('https://storage.test/x', {}, mp4(), vi.fn());
    FakeXhr.last.finish(403);

    const error = await done.catch((e) => e);
    expect(error).toBeInstanceOf(VideoUploadError);
    expect(error).toMatchObject({ kind: 'rejected', status: 403 });
    expect(error.message).toMatch(/refused the upload \(status 403\)/);
  });

  it('rejects with a connection message on a network error', async () => {
    const done = putToStorage('https://storage.test/x', {}, mp4(), vi.fn());
    FakeXhr.last.onerror?.();

    await expect(done).rejects.toMatchObject({ kind: 'network' });
  });

  it('can be cancelled', async () => {
    const controller = new AbortController();
    const done = putToStorage('https://storage.test/x', {}, mp4(), vi.fn(), controller.signal);
    controller.abort();

    await expect(done).rejects.toMatchObject({ kind: 'aborted' });
    expect(FakeXhr.last.aborted).toBe(true);
  });

  it('does not start when already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const done = putToStorage('https://storage.test/x', {}, mp4(), vi.fn(), controller.signal);

    await expect(done).rejects.toMatchObject({ kind: 'aborted' });
    expect(FakeXhr.last.body).toBeNull();
  });
});

describe('uploadVideo', () => {
  it('asks for an upload URL for the exact size, uploads, and returns the asset key', async () => {
    api.getVideoUploadUrl.mockResolvedValue({
      assetKey: 'videos/abc.mp4',
      method: 'PUT',
      uploadUrl: 'https://storage.test/videos/abc.mp4',
      requiredHeaders: { 'Content-Type': 'video/mp4' },
      expiresAt: '2026-10-20T13:00:00Z',
    });
    const file = mp4(2048);

    const pending = uploadVideo(file, vi.fn());
    await vi.waitFor(() => expect(FakeXhr.last?.url).toBe('https://storage.test/videos/abc.mp4'));
    FakeXhr.last.finish(200);

    await expect(pending).resolves.toBe('videos/abc.mp4');
    expect(api.getVideoUploadUrl).toHaveBeenCalledWith({
      contentType: 'video/mp4',
      sizeBytes: 2048,
    });
  });

  it('refuses a file of the wrong type without calling the server', async () => {
    const file = new File(['x'], 'clip.mov', { type: 'video/quicktime' });

    await expect(uploadVideo(file, vi.fn())).rejects.toMatchObject({ kind: 'rejected' });
    expect(api.getVideoUploadUrl).not.toHaveBeenCalled();
  });
});

describe('readVideoDuration', () => {
  it('rounds the length of the file up to whole seconds', async () => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    });
    const video = { preload: '', src: '', duration: 61.2, removeAttribute: vi.fn() } as unknown as {
      onloadedmetadata: () => void;
      onerror: () => void;
    };
    vi.spyOn(document, 'createElement').mockReturnValue(video as unknown as HTMLElement);

    const pending = readVideoDuration(mp4());
    video.onloadedmetadata();

    await expect(pending).resolves.toBe(62);
  });

  it('gives null when the file cannot be read', async () => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    });
    const video = { removeAttribute: vi.fn() } as unknown as { onerror: () => void };
    vi.spyOn(document, 'createElement').mockReturnValue(video as unknown as HTMLElement);

    const pending = readVideoDuration(mp4());
    video.onerror();

    await expect(pending).resolves.toBeNull();
  });
});
