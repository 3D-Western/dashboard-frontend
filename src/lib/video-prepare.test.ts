import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareVideo, setVideoPreparer } from './video-prepare';

const file = new File(['x'], 'a.mp4', { type: 'video/mp4' });
const info = { durationSeconds: 10, width: 1280, height: 720 };

afterEach(() => setVideoPreparer());

describe('prepareVideo', () => {
  it('hands the file back unchanged until a preparer is registered', async () => {
    expect(await prepareVideo(file, info, [])).toBe(file);
  });

  it('uses the registered preparer, with what is known about the file', async () => {
    const smaller = new File(['y'], 'a-720p.mp4', { type: 'video/mp4' });
    const preparer = vi.fn(async () => smaller);
    setVideoPreparer(preparer);
    const signal = new AbortController().signal;

    expect(await prepareVideo(file, info, [], signal)).toBe(smaller);
    expect(preparer).toHaveBeenCalledWith(file, info, [], signal);
  });

  it('goes back to the default when the preparer is removed', async () => {
    setVideoPreparer(async () => new File(['z'], 'z.mp4'));
    setVideoPreparer();

    expect(await prepareVideo(file, info, [])).toBe(file);
  });
});
